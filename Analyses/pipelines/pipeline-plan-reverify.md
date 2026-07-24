# PSG Auto Vector Pipeline — SPEC Compliance Gap Plan (Re-verify)

> **Generated**: 2026-05-06  
> **Baseline**: 88% SPEC compliance, 476 tests green  
> **Goal**: Close all 6 remaining SPEC gaps + verify 3 code-quality fixes

---

## SPEC Requirements Summary (Reference)

From `psg/automation/SPEC.md`:

| # | Requirement | Location in SPEC |
|---|---|---|
| R1 | Reporter must **send** Discord notification (not just generate message) | §4: "Send Discord notification" |
| R2 | Cron: Daily at 03:00 EET | §Scheduling |
| R3 | If web search fails → load **cached** `sources.json` | §Error Handling |
| R4 | Generator output: `new_vectors_YYYYMMDD.json` | §2 Output |
| R5 | Tester output: `auto_YYYYMMDD_MODEL.json` | §3 Output |
| R6 | Top findings format: `- [technique] flagged on [models]` | §Notification Format |

---

## Gap 1: Discord Webhook Send (R1)

### What SPEC Requires
Section 4 (reporter.py): *"Send Discord notification"* — the SPEC explicitly says "send," not "generate." The notification must be POSTed to a Discord webhook URL.

### What's Currently Implemented
- `reporter.py:generate_discord_message()` (line 144) generates the message string.
- `main.py:run_reporting()` (line 107) calls `generate_discord_message()` but only logs the result with `logger.debug()`.
- `config.py:PipelineConfig` has `notify_discord: bool = True` but it is never consumed anywhere.
- **No `requests.post`, `urllib.request`, or `webhook_url` field exists.**

### Proposed Changes

#### File: `psg/automation/config.py`
Add a `discord_webhook_url` field to `PipelineConfig`:
```python
# Notification
notify_discord: bool = True
discord_webhook_url: str = field(
    default_factory=lambda: os.environ.get("PSG_DISCORD_WEBHOOK", "")
)
```

#### File: `psg/automation/reporter.py`
Add a `send_discord_notification()` method to `Reporter`:
```python
def send_discord_notification(self, report: PipelineReport) -> bool:
    """POST the Discord message to the configured webhook.
    
    Returns True if the message was sent successfully, False otherwise.
    If no webhook URL is configured, logs a warning and returns False.
    """
    if not self.config.discord_webhook_url:
        logger.warning("No Discord webhook URL configured — skipping notification send")
        return False
    
    message = self.generate_discord_message(report)
    payload = {"content": message}
    
    try:
        import urllib.request
        import urllib.error
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.config.discord_webhook_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 204 or resp.status == 200
    except Exception as e:
        logger.error(f"Discord webhook send failed: {e}")
        return False
```
Also add `import json` at the top of `reporter.py` (currently not imported).

#### File: `psg/automation/main.py`
In `run_reporting()` (line ~107), replace the debug-only logging with an actual send:
```python
# Before:
discord_msg = self.reporter.generate_discord_message(report)
logger.debug(f"Discord message:\n{discord_msg}")

# After:
if self.config.notify_discord:
    sent = self.reporter.send_discord_notification(report)
    if sent:
        logger.info("Discord notification sent")
    else:
        logger.warning("Discord notification not sent (no webhook or send failed)")
else:
    logger.info("Discord notification disabled in config")
```

### Test Cases (TDD)

**File: `tests/test_psg_automation_reporter.py`**

```python
# test_send_discord_notification_posts_to_webhook
def test_send_discord_notification_posts_to_webhook(tmp_path, monkeypatch):
    """When webhook URL is configured, send_discord_notification must POST."""
    config = _make_config(tmp_path)
    config.discord_webhook_url = "https://discord.com/api/webhooks/test"
    reporter = Reporter(config)
    report = PipelineReport(
        date="2026-01-01", sources_found=0, vectors_generated=0,
        models_tested=0, total_tests=0, total_flagged=0,
        results=[], top_findings=[],
    )
    
    posted = {"called": False, "data": None}
    
    class MockHandler:
        def __init__(self, req, timeout=None):
            self.req = req
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        @property
        def status(self):
            return 204
    
    def mock_urlopen(req, timeout=None):
        posted["called"] = True
        posted["data"] = json.loads(req.data.decode("utf-8"))
        return MockHandler(req, timeout)
    
    monkeypatch.setattr("urllib.request.urlopen", mock_urlopen)
    result = reporter.send_discord_notification(report)
    
    assert result is True
    assert posted["called"] is True
    assert "content" in posted["data"]
    assert "🔬" in posted["data"]["content"]

# test_send_discord_notification_returns_false_when_no_webhook
def test_send_discord_notification_returns_false_when_no_webhook(tmp_path):
    """When no webhook URL is configured, send must return False."""
    config = _make_config(tmp_path)
    # discord_webhook_url defaults to ""
    reporter = Reporter(config)
    report = PipelineReport(
        date="2026-01-01", sources_found=0, vectors_generated=0,
        models_tested=0, total_tests=0, total_flagged=0,
        results=[], top_findings=[],
    )
    assert reporter.send_discord_notification(report) is False

# test_send_discord_notification_returns_false_on_http_error
def test_send_discord_notification_returns_false_on_http_error(tmp_path, monkeypatch):
    """When the POST fails (network error), send must return False, not raise."""
    config = _make_config(tmp_path)
    config.discord_webhook_url = "https://discord.com/api/webhooks/test"
    reporter = Reporter(config)
    report = PipelineReport(
        date="2026-01-01", sources_found=0, vectors_generated=0,
        models_tested=0, total_tests=0, total_flagged=0,
        results=[], top_findings=[],
    )
    
    def mock_urlopen(req, timeout=None):
        raise urllib.error.URLError("connection refused")
    
    monkeypatch.setattr("urllib.request.urlopen", mock_urlopen)
    assert reporter.send_discord_notification(report) is False
```

---

## Gap 2: Cron/Scheduler (R2)

### What SPEC Requires
- *"Cron: Daily at 03:00 EET"*  
- `"Manual: python -m psg.automation"`

### What's Currently Implemented
- `daily_check.py` exists with `check()` and `mark()` functions — it's a **guard** (checks if already run today), not a scheduler.
- There is **no crontab entry file**, no `setup_cron()` function, and no documentation on how to install cron.

### Proposed Changes

#### File: `psg/automation/cron.py` (NEW)
```python
"""Cron setup for daily automation pipeline.

Provides a function to install a crontab entry that runs the pipeline
daily at 03:00 EET (01:00 UTC), plus a CLI to check/remove it.
"""
from __future__ import annotations

import subprocess
import sys


CRON_ENTRY = "0 1 * * * cd {project_root} && {python} -m psg.automation >> {log_dir}/auto_pipeline.log 2>&1"


def get_cron_entries() -> list[str]:
    """Return current crontab lines (empty list if no crontab)."""
    try:
        result = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0:
            return []
        return result.stdout.strip().splitlines()
    except FileNotFoundError:
        return []


def is_cron_installed(project_root: str) -> bool:
    """Check if the PSG cron entry is already in the user's crontab."""
    entries = get_cron_entries()
    return any("psg.automation" in line and project_root in line for line in entries)


def install_cron(project_root: str, python_path: str, log_dir: str) -> bool:
    """Install the daily cron entry. Returns True on success."""
    entry = CRON_ENTRY.format(
        project_root=project_root,
        python=python_path,
        log_dir=log_dir,
    )
    
    existing = get_cron_entries()
    # Remove any old psg.automation entry
    filtered = [l for l in existing if "psg.automation" not in l]
    filtered.append(entry)
    
    new_cron = "\n".join(filtered) + "\n"
    
    try:
        proc = subprocess.run(
            ["crontab", "-"], input=new_cron, text=True, capture_output=True, timeout=5
        )
        return proc.returncode == 0
    except FileNotFoundError:
        return False


def remove_cron(project_root: str) -> bool:
    """Remove the PSG cron entry. Returns True on success."""
    existing = get_cron_entries()
    filtered = [l for l in existing if "psg.automation" not in l]
    
    new_cron = "\n".join(filtered) + "\n" if filtered else ""
    
    try:
        proc = subprocess.run(
            ["crontab", "-"], input=new_cron, text=True, capture_output=True, timeout=5
        )
        return proc.returncode == 0
    except FileNotFoundError:
        return False


def main() -> int:
    import argparse
    from pathlib import Path
    from .config import PipelineConfig, load_config
    
    parser = argparse.ArgumentParser(description="Manage PSG automation cron")
    parser.add_argument("action", choices=["install", "remove", "check"])
    parser.add_argument("--config", type=Path, help="Config file path")
    args = parser.parse_args()
    
    config = load_config(args.config)
    root = str(config.project_root)
    
    if args.action == "install":
        ok = install_cron(root, config.python_executable, str(config.logs_dir))
        print("Cron installed" if ok else "Failed to install cron")
        return 0 if ok else 1
    elif args.action == "remove":
        ok = remove_cron(root)
        print("Cron removed" if ok else "Failed to remove cron")
        return 0 if ok else 1
    elif args.action == "check":
        installed = is_cron_installed(root)
        print("Cron is installed" if installed else "Cron is NOT installed")
        return 0 if installed else 1
    return 1


if __name__ == "__main__":
    sys.exit(main())
```

#### File: `psg/automation/__init__.py`
Export `cron` module (optional; module is importable as `psg.automation.cron`).

### Test Cases (TDD)

**File: `tests/test_psg_automation_cron.py` (NEW)**

```python
# test_install_cron_adds_entry
def test_install_cron_adds_entry(monkeypatch):
    """install_cron must add a crontab line containing 'psg.automation'."""
    current_cron = []
    new_cron_input = {"data": ""}
    
    monkeypatch.setattr("psg.automation.cron.get_cron_entries", lambda: current_cron)
    monkeypatch.setattr("psg.automation.cron.subprocess.run", lambda *a, **kw: ...)
    # More granular: mock subprocess.run to capture "psg.automation" in the entry
    # Verify the CRON_ENTRY template includes "psg.automation" and "01:00" or "03:00"

# test_is_cron_installed_detects_existing_entry
def test_is_cron_installed_detects_existing():
    """is_cron_installed returns True when psg.automation entry exists."""
    from psg.automation.cron import is_cron_installed
    # Mock get_cron_entries to return a line with "psg.automation"
    ...

# test_remove_cron_removes_entry
def test_remove_cron_removes_entry():
    """remove_cron must strip lines containing 'psg.automation'."""
    ...

# test_cron_entry_contains_schedule_and_command
def test_cron_entry_format():
    """The CRON_ENTRY string must contain the schedule and psg.automation."""
    from psg.automation.cron import CRON_ENTRY
    # Must start with "0 1" (01:00 UTC = 03:00 EET)
    assert CRON_ENTRY.startswith("0 1")
    assert "psg.automation" in CRON_ENTRY
```

---

## Gap 3: Cached Sources Fallback (R3)

### What SPEC Requires
*"If web search fails → use cached sources"* (§Error Handling)

### What's Currently Implemented
- `DiscoveryEngine.discover()` (discovery.py, line 195-244): when `search_func` raises an exception for a given query, it logs and **continues** to the next query. But if **all** queries fail, it returns an **empty list** — it never attempts to load a previous `sources.json`.
- `main.py:run_discovery()` does not fall back to any cached file either.
- The `sources_YYYYMMDD.json` files are saved by `run_discovery()`, so previous days' files exist on disk.

### Proposed Changes

#### File: `psg/automation/discovery.py`
Add a method to `DiscoveryEngine`:

```python
def load_cached_sources(self, base_dir: Path | None = None) -> list[Source]:
    """Load the most recent sources_*.json file as a fallback.
    
    Returns an empty list if no cached files are found.
    """
    search_dir = base_dir or self.config.base_dir
    
    # Find all sources_*.json files, sorted newest first
    candidates = sorted(search_dir.glob("sources_*.json"), reverse=True)
    
    for path in candidates:
        try:
            with open(path) as f:
                data = json.load(f)
            sources = []
            for s in data.get("sources", []):
                sources.append(Source(
                    url=s["url"],
                    title=s.get("title", ""),
                    snippet=s.get("snippet", ""),
                    query=s.get("query", ""),
                    discovered_at=s.get("discovered_at", ""),
                ))
            logger.info(f"Loaded {len(sources)} cached sources from {path}")
            return sources
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to load cached sources from {path}: {e}")
            continue
    
    logger.warning("No cached sources files found")
    return []
```

#### File: `psg/automation/main.py`
In `run_discovery()`, after the discover call, add fallback logic:

```python
def run_discovery(self) -> list[Source]:
    """Run discovery phase. Falls back to cached sources if all searches fail."""
    logger.info("=== DISCOVERY PHASE ===")
    sources = self.discovery.discover()
    
    if sources:
        logger.info(f"Found {len(sources)} new sources")
        output_path = (
            self.config.base_dir
            / f"sources_{datetime.now().strftime('%Y%m%d')}.json"
        )
        self.discovery.save_sources(sources, output_path)
    else:
        # SPEC: If web search fails, use cached sources
        logger.warning("No new sources found — falling back to cached sources")
        sources = self.discovery.load_cached_sources()
        if sources:
            logger.info(f"Using {len(sources)} cached sources as fallback")
        else:
            logger.error("No sources available (no new and no cached)")
    
    return sources
```

### Test Cases (TDD)

**File: `tests/test_psg_automation_discovery.py`** (append)

```python
# test_load_cached_sources_from_file
def test_load_cached_sources_from_file(tmp_path):
    """load_cached_sources must read the most recent sources_*.json 
    and return Source objects."""
    # Write a sources_20260505.json file
    data = {
        "discovered_at": "2026-05-05",
        "count": 2,
        "sources": [
            {"url": "https://cached.com/1", "title": "C1", "snippet": "S1",
             "query": "q1", "discovered_at": "2026-05-05"},
            {"url": "https://cached.com/2", "title": "C2", "snippet": "S2",
             "query": "q2", "discovered_at": "2026-05-05"},
        ],
    }
    (tmp_path / "sources_20260505.json").write_text(json.dumps(data))
    
    cfg = _make_config(tmp_path)
    engine = DiscoveryEngine(cfg, search_func=_mock_search_func([]))
    sources = engine.load_cached_sources(tmp_path)
    
    assert len(sources) == 2
    assert sources[0].url == "https://cached.com/1"

# test_load_cached_sources_returns_empty_when_no_files
def test_load_cached_sources_returns_empty_when_no_files(tmp_path):
    """When no sources_*.json files exist, return empty list."""
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as td:
        empty = Path(td)
        cfg = _make_config(tmp_path)
        engine = DiscoveryEngine(cfg, search_func=_mock_search_func([]))
        assert engine.load_cached_sources(empty) == []

# test_load_cached_sources_picks_most_recent
def test_load_cached_sources_picks_most_recent(tmp_path):
    """If multiple sources_*.json exist, load the one with the newest date."""
    old_data = {"discovered_at": "2026-01-01", "count": 1, "sources": [
        {"url": "https://old.com", "title": "Old", "snippet": "", 
         "query": "q", "discovered_at": "2026-01-01"},
    ]}
    new_data = {"discovered_at": "2026-05-05", "count": 1, "sources": [
        {"url": "https://new.com", "title": "New", "snippet": "",
         "query": "q", "discovered_at": "2026-05-05"},
    ]}
    (tmp_path / "sources_20260101.json").write_text(json.dumps(old_data))
    (tmp_path / "sources_20260505.json").write_text(json.dumps(new_data))
    
    cfg = _make_config(tmp_path)
    engine = DiscoveryEngine(cfg, search_func=_mock_search_func([]))
    sources = engine.load_cached_sources(tmp_path)
    assert len(sources) == 1
    assert sources[0].url == "https://new.com"
```

**File: `tests/test_psg_automation_main.py`** (append)

```python
# test_run_discovery_falls_back_to_cached_sources
def test_run_discovery_falls_back_to_cached_sources(tmp_path: Path):
    """When discover() returns empty, run_discovery should call 
    load_cached_sources() and use those instead."""
    config = _make_config(tmp_path)
    pipeline = Pipeline(config)
    
    pipeline.discovery.discover = MagicMock(return_value=[])
    pipeline.discovery.load_cached_sources = MagicMock(return_value=[
        MagicMock(url="https://cached.com")
    ])
    pipeline.discovery.save_sources = MagicMock()
    
    sources = pipeline.run_discovery()
    assert len(sources) == 1
    pipeline.discovery.load_cached_sources.assert_called_once()
```

---

## Gap 4: File Naming — new_vectors_YYYYMMDD.json (R4)

### What SPEC Requires
Generator output: `new_vectors_YYYYMMDD.json`

### What's Currently Implemented
- `main.py:run_generation()` (line 65): `auto_{datetime.now().strftime('%Y%m%d')}.json`
- The SPEC explicitly says `new_vectors_YYYYMMDD.json`.

### Proposed Changes

#### File: `psg/automation/main.py`
Change the filename pattern in `run_generation()`:

```python
# Before (line 65-66):
output_path = (
    self.config.datasets_dir
    / f"auto_{datetime.now().strftime('%Y%m%d')}.json"
)

# After:
output_path = (
    self.config.datasets_dir
    / f"new_vectors_{datetime.now().strftime('%Y%m%d')}.json"
)
```

### Test Cases (TDD)

**File: `tests/test_psg_automation_main.py`** (modify existing test)

```python
# test_run_generation_uses_spec_filename_pattern
def test_run_generation_uses_spec_filename_pattern(tmp_path: Path):
    """The saved vectors file must follow SPEC naming: new_vectors_YYYYMMDD.json."""
    config = _make_config(tmp_path)
    pipeline = Pipeline(config)
    
    fake_vector = MagicMock()
    fake_vector.__len__ = lambda _: 1
    pipeline.generator = MagicMock()
    pipeline.generator.generate_from_sources.return_value = [fake_vector]
    pipeline.generator.save_vectors = MagicMock()
    
    vectors, saved_path = pipeline.run_generation([MagicMock()])
    
    # The filename must start with "new_vectors_" and end with ".json"
    filename = saved_path.name
    assert filename.startswith("new_vectors_")
    assert filename.endswith(".json")
    # Pattern must be new_vectors_YYYYMMDD.json (8-digit date)
    import re
    assert re.match(r"new_vectors_\d{8}\.json", filename), f"Filename {filename} doesn't match SPEC pattern"
```

Also update `test_run_full_uses_actual_vectors_path_not_datetime_now` to use `new_vectors_` prefix instead of `auto_`.

---

## Gap 5: Tester Output Naming — auto_YYYYMMDD_MODEL.json (R5)

### What SPEC Requires
Tester output: `auto_YYYYMMDD_MODEL.json`

### What's Currently Implemented
- `tester.py:run_test()` (lines 112-116): The output filename is `auto_YYYYMMDD_MODEL_HHMMSS.json` — it includes a timestamp `_%H%M%S`.
- SPEC says: `auto_YYYYMMDD_MODEL.json` — **no timestamp/hour-minute-second component**.

### Proposed Changes

#### File: `psg/automation/tester.py`
Remove the `_H%M%S` component from the timestamp in `run_test()`:

```python
# Before (lines 112-113):
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_safe = model.replace(":", "_")

# Build output_base with just date + model
output_base = (
    self.config.results_dir / f"{output_prefix}_{model_safe}_{timestamp}"
)

# After:
date = datetime.now().strftime("%Y%m%d")
model_safe = model.replace(":", "_")

output_base = (
    self.config.results_dir / f"{output_prefix}_{date}_{model_safe}"
)
```

Also update `run_in_tmux()` to match the same pattern (lines 224-226):
```python
# In the shell script template, the output files should use:
# {output_prefix}_${MODEL_SAFE}.json instead of with timestamp
# Already uses $MODEL_SAFE without timestamp, so this is fine.
```

**Note**: The `run_in_tmux()` method in the shell script (line 225) already uses `{output_prefix}_${{MODEL_SAFE}}.json` without timestamp, so it's already SPEC-compliant. Only `run_test()` in direct execution mode has the extra timestamp.

### Test Cases (TDD)

**File: `tests/test_psg_automation_tester.py`** (append)

```python
# test_run_test_output_filename_matches_spec_pattern
def test_run_test_output_filename_matches_spec_pattern(tmp_path: Path):
    """The output filename must be auto_YYYYMMDD_MODEL.json (SPEC format),
    not auto_YYYYMMDD_MODEL_HHMMSS.json."""
    config = _make_config(tmp_path)
    tester = PipelineTester(config)
    
    mock_result = MagicMock()
    mock_result.stdout = "total=1 succeeded=1 failed=0 flagged=0"
    mock_result.returncode = 0
    
    with patch("psg.automation.tester.subprocess.run", return_value=mock_result):
        with patch("psg.automation.tester.time.time", side_effect=[0.0, 1.0]):
            result = tester.run_test(Path("/tmp/v.json"), "llama3:8b", "auto")
    
    assert result is not None
    filename = result.output_path.name
    # SPEC: auto_YYYYMMDD_MODEL.json pattern (no timestamp component)
    # The filename in the ModelTestResult.output_path should match auto_YYYYMMDD_llama3_8b.txt
    import re
    # Must NOT contain hour-minute-second pattern after model name
    assert re.match(r"auto_\d{8}_llama3_8b\.txt", filename), \
        f"Filename {filename} should follow SPEC pattern auto_YYYYMMDD_MODEL.txt"
```

---

## Gap 6: Top Findings Format — Grouped by Technique (R6)

### What SPEC Requires
```
Top findings:
- [technique] flagged on [models]
```
The SPEC groups findings by **technique**, listing which models each technique was flagged on.

### What's Currently Implemented
- `reporter.py` has a module-level docstring explicitly acknowledging this as a **known limitation**:  
  *"top_findings aggregates results by model, not by technique, because individual test results do not currently carry technique-level metadata."*
- The `top_findings` list in `create_report()` (line 72) groups by `model`, not `technique`.
- The `generate_discord_message()` (line 174) prints `"- {finding['model']}: {finding['flagged']} flagged"` — the format is `model: count`, not `[technique] flagged on [models]`.

### Root Cause Analysis
The `ModelTestResult` dataclass (tester.py, line 21) only tracks `model`, `total`, `succeeded`, `failed`, `flagged`, `duration_seconds`, and `output_path`. It has **no `technique` field** and no per-technique breakdown. The test results parsed from stdout only contain aggregate model-level stats.

To properly fix this, we need to:
1. Parse the JSON report file produced by `psg --json-report` to extract technique-level data.
2. Or thread the `AttackVector.technique` field through the testing pipeline.

### Proposed Changes

#### Approach: Parse technique data from the JSON report file

Since `ModelTestResult` already stores `output_path`, and `psg --json-report` produces per-vector results that include technique info, we can parse this file to build technique-grouped findings.

#### File: `psg/automation/tester.py`
Add a method to extract technique-level results from the JSON report:

```python
def get_technique_results(self, result: ModelTestResult) -> dict[str, dict]:
    """Parse the JSON report file to get technique-level flagging stats.
    
    Returns a dict mapping technique -> {
        'flagged': int,
        'total': int,
        'models': list[str],
    }
    """
    json_path = Path(str(result.output_path).replace('.txt', '.json'))
    if not json_path.exists():
        return {}
    
    try:
        with open(json_path) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}
    
    technique_stats: dict[str, dict] = {}
    
    # The JSON report is expected to have a "results" list
    # with per-vector entries that include "technique" and "flagged"
    for entry in data.get("results", []):
        technique = entry.get("technique", "unknown")
        flagged = entry.get("flagged", False)
        
        if technique not in technique_stats:
            technique_stats[technique] = {
                "flagged": 0,
                "total": 0,
                "models": [],
            }
        technique_stats[technique]["total"] += 1
        if flagged:
            technique_stats[technique]["flagged"] += 1
        if result.model not in technique_stats[technique]["models"]:
            technique_stats[technique]["models"].append(result.model)
    
    return technique_stats
```

#### File: `psg/automation/reporter.py`
Rewrite `create_report()` to group by technique when technique data is available:

```python
class Reporter:
    def __init__(self, config: PipelineConfig) -> None:
        self.config = config
    
    def create_report(
        self,
        sources: list[Source],
        vectors: list[AttackVector],
        results: list[ModelTestResult],
        tester: PipelineTester | None = None,
    ) -> PipelineReport:
        """Create a pipeline report.
        
        When a tester is provided, attempts to group top_findings by technique
        using per-vector JSON reports. Falls back to model-level grouping.
        """
        total_tests = sum(r.total for r in results)
        total_flagged = sum(r.flagged for r in results)
        
        # Build technique-grouped top findings (SPEC requirement)
        top_findings: list[dict[str, Any]] = []
        
        if tester is not None:
            # Collect technique-level data across all models
            technique_map: dict[str, dict] = {}
            for r in results:
                tech_results = tester.get_technique_results(r)
                for tech, stats in tech_results.items():
                    if tech not in technique_map:
                        technique_map[tech] = {"flagged": 0, "total": 0, "models": []}
                    technique_map[tech]["flagged"] += stats["flagged"]
                    technique_map[tech]["total"] += stats["total"]
                    for m in stats["models"]:
                        if m not in technique_map[tech]["models"]:
                            technique_map[tech]["models"].append(m)
            
            # Convert to list and sort by flagged count (descending)
            for tech, stats in sorted(
                technique_map.items(), key=lambda x: x[1]["flagged"], reverse=True
            ):
                if stats["flagged"] > 0:
                    top_findings.append({
                        "technique": tech,
                        "flagged": stats["flagged"],
                        "models": ", ".join(stats["models"]),
                    })
            
            top_findings = top_findings[:5]
        
        # Fallback: if no technique data, group by model
        if not top_findings:
            for r in sorted(results, key=lambda x: x.flagged, reverse=True):
                if r.flagged > 0:
                    top_findings.append({
                        "technique": "unknown",
                        "flagged": r.flagged,
                        "models": r.model,
                    })
            top_findings = top_findings[:5]
        
        return PipelineReport(
            date=datetime.now().strftime("%Y%m%d"),  # Changed from %Y-%m-%d to match SPEC YYYYMMDD format for reports/YYYYMMDD.md
            sources_found=len(sources),
            vectors_generated=len(vectors),
            models_tested=len(results),
            total_tests=total_tests,
            total_flagged=total_flagged,
            results=results,
            top_findings=top_findings[:5],
        )
```

Also update `generate_discord_message()` and `generate_markdown()`:

```python
# In generate_discord_message (line ~174):
# Before:
#   f"- {finding['model']}: {finding['flagged']} flagged"
# After:
for finding in report.top_findings[:3]:
    technique = finding.get("technique", "unknown")
    models = finding.get("models", "")
    lines.append(
        f"- [{technique}] flagged on [{models}]"
    )

# In generate_markdown (line ~128):
# Before:
#   f"**{finding['model']}**: {finding['flagged']} flagged ({finding['rate']})"
# After:
for finding in report.top_findings:
    technique = finding.get("technique", "unknown")
    models = finding.get("models", "")
    flagged = finding.get("flagged", 0)
    lines.append(
        f"- **[{technique}]** flagged on [{models}] ({flagged} flagged)"
    )
```

#### File: `psg/automation/main.py`
Pass the tester instance to `create_report`:

```python
# In run_reporting():
# Before:
report = self.reporter.create_report(sources, vectors, results)

# After:
report = self.reporter.create_report(sources, vectors, results, tester=self.tester)
```

### Test Cases (TDD)

**File: `tests/test_psg_automation_reporter.py`** (append)

```python
# test_top_findings_grouped_by_technique_with_tester
def test_top_findings_grouped_by_technique_with_tester(tmp_path: Path):
    """When technique data is available, top_findings must be grouped by
    technique with 'models' listing which models flagged each technique."""
    config = _make_config(tmp_path)
    reporter = Reporter(config)
    
    mock_tester = MagicMock()
    mock_tester.get_technique_results.side_effect = [
        # Model A results
        {"injection": {"flagged": 3, "total": 5, "models": ["model-a"]},
         "roleplay": {"flagged": 1, "total": 5, "models": ["model-a"]}},
        # Model B results  
        {"injection": {"flagged": 2, "total": 5, "models": ["model-b"]}},
    ]
    
    results = [
        _make_result("model-a", total=10, flagged=4),
        _make_result("model-b", total=10, flagged=2),
    ]
    
    report = reporter.create_report([], [], results, tester=mock_tester)
    
    # Must have technique-based findings
    assert len(report.top_findings) > 0
    tech_finding = report.top_findings[0]
    assert "technique" in tech_finding
    assert "models" in tech_finding
    # Injection should be the top (3+2=5 flagged across models)
    assert tech_finding["technique"] == "injection"
    assert "model-a" in tech_finding["models"]
    assert "model-b" in tech_finding["models"]

# test_discord_message_uses_technique_format
def test_discord_message_uses_technique_format(tmp_path: Path):
    """Discord message top_findings must follow SPEC format:
    '- [technique] flagged on [models]'"""
    config = _make_config(tmp_path)
    reporter = Reporter(config)
    
    report = PipelineReport(
        date="20260506",
        sources_found=1,
        vectors_generated=5,
        models_tested=2,
        total_tests=20,
        total_flagged=5,
        results=[],
        top_findings=[
            {"technique": "injection", "flagged": 5, "models": "model-a, model-b"},
        ],
    )
    
    msg = reporter.generate_discord_message(report)
    assert "- [injection] flagged on [model-a, model-b]" in msg

# test_top_findings_falls_back_to_model_when_no_tester
def test_top_findings_falls_back_to_model_when_no_tester(tmp_path: Path):
    """When no tester is provided, top_findings should fall back to 
    model-level grouping with technique='unknown'."""
    config = _make_config(tmp_path)
    reporter = Reporter(config)
    
    results = [
        _make_result("model-a", total=10, flagged=5),
        _make_result("model-b", total=10, flagged=2),
    ]
    
    report = reporter.create_report([], [], results)  # No tester
    
    assert len(report.top_findings) > 0
    # Falls back to model-level grouping
    assert report.top_findings[0]["technique"] == "unknown"
    assert "model-a" in report.top_findings[0]["models"]
```

**File: `tests/test_psg_automation_tester.py`** (append)

```python
# test_get_technique_results_parses_json_report
def test_get_technique_results_parses_json_report(tmp_path: Path):
    """get_technique_results must parse a JSON report and return
    per-technique flagged counts."""
    config = _make_config(tmp_path)
    tester = PipelineTester(config)
    
    # Create a mock JSON report
    json_path = tmp_path / "results" / "auto_20260506_llama3_8b.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps({
        "results": [
            {"prompt": "test1", "technique": "injection", "flagged": True},
            {"prompt": "test2", "technique": "injection", "flagged": True},
            {"prompt": "test3", "technique": "roleplay", "flagged": False},
        ]
    }))
    
    result = _make_result("llama3:8b")
    result.output_path = tmp_path / "results" / "auto_20260506_llama3_8b.txt"
    
    tech_results = tester.get_technique_results(result)
    assert "injection" in tech_results
    assert tech_results["injection"]["flagged"] == 2
    assert tech_results["injection"]["total"] == 2
    assert "roleplay" in tech_results
    assert tech_results["roleplay"]["flagged"] == 0
    assert tech_results["roleplay"]["total"] == 1
```

---

## Code Quality Verification

### Concern 1: `discovery.py` — retry decorator wraps function but doesn't pass args

**Status: ✅ FIXED**

Looking at the current `discovery.py:43-64`, the `retry` decorator:
```python
def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            ...
            return func(*args, **kwargs)
```
This correctly passes `*args, **kwargs` through to the wrapped function. The `functools.wraps` decorator preserves metadata. The test `test_retry_preserves_function_name` in `test_psg_automation_discovery.py` confirms `__name__` and `__doc__` are preserved. **No bug here.**

### Concern 2: `generator.py` — `default_generate_func` doesn't use config

**Status: ✅ FIXED**

Looking at `generator.py:83-89`:
```python
def default_generate_func(prompt: str) -> str:
    """...Uses default config values. For custom config, use
    ``create_generate_func(config)`` instead."""
    return create_generate_func(PipelineConfig())(prompt)
```
This now creates a `PipelineConfig()` (with defaults) and passes it to `create_generate_func`, which uses `config.generator_model` and `config.ollama_base_url`. This is the correct pattern — `default_generate_func` uses default config, while callers who need custom config use `create_generate_func(config)`. **No bug here.**

### Concern 3: `main.py` — `run_discovery` missing return statement

**Status: ✅ FIXED**

Looking at `main.py:34-47`:
```python
def run_discovery(self) -> list[Source]:
    """Run discovery phase."""
    logger.info("=== DISCOVERY PHASE ===")
    sources = self.discovery.discover()
    logger.info(f"Found {len(sources)} new sources")
    
    if sources:
        output_path = (
            self.config.base_dir
            / f"sources_{datetime.now().strftime('%Y%m%d')}.json"
        )
        self.discovery.save_sources(sources, output_path)
    
    return sources
```
The `return sources` is present at line 47. **No bug here.**

---

## Summary: All Changes Required

| Gap | Files to Modify | New Files | Tests to Add |
|-----|----------------|-----------|--------------|
| 1 — Discord send | `config.py`, `reporter.py`, `main.py` | — | 3 in reporter |
| 2 — Cron/scheduler | — | `cron.py` | 4 in new cron test file |
| 3 — Cached sources fallback | `discovery.py`, `main.py` | — | 4 in discovery, 1 in main |
| 4 — File naming `new_vectors_` | `main.py` | — | 1 in main (modify 1 existing) |
| 5 — Tester output naming | `tester.py` | — | 1 in tester |
| 6 — Top findings by technique | `reporter.py`, `tester.py`, `main.py` | — | 4 in reporter, 1 in tester |

### Code Quality Concerns
| Concern | Status |
|---------|--------|
| retry decorator args passthrough | ✅ Fixed |
| default_generate_func uses config | ✅ Fixed |
| run_discovery return statement | ✅ Fixed |

---

## Implementation Order

1. **Gap 5** (tester output naming) — simplest, one-line change
2. **Gap 4** (file naming `new_vectors_`) — simple string change
3. **Gap 3** (cached sources fallback) — medium complexity, no breaking changes
4. **Gap 1** (Discord webhook send) — medium complexity, new method
5. **Gap 6** (top findings by technique) — most complex, changes data flow across modules
6. **Gap 2** (cron/scheduler) — new file, standalone, no dependencies on other gaps

Each gap should be implemented in TDD order: write failing test → implement change → verify test passes → run full suite.