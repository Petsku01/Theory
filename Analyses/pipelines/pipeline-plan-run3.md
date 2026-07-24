# PSG Auto Vector Pipeline — Run 3 Implementation Plan

**Audited:** All files in `psg/automation/*.py`, all `tests/test_psg_automation_*.py`, and `psg/automation/SPEC.md`  
**Date:** 2026-05-06  
**Previous runs:** Run 1 (88%), Run 2 (92%), 502 tests passing

---

## CRITICAL (Must Fix)

### C1. SPEC.md still references Discord webhook/notification — contradicts design decision
- **File:** `psg/automation/SPEC.md`, lines 47–48  
- **What's wrong:** SPEC says `Send Discord notification` (line 47) and `reports/YYYYMMDD.md + Discord message` (line 48). Discord was removed as bloat in Run 2. The function was renamed `generate_discord_message` → `generate_summary_message`. SPEC is now out of sync with implementation and misleading.  
- **Fix:** Update SPEC.md lines 47–48 to replace "Discord notification" with "summary notification (logged)" and "Discord message" with "summary message". Update the Notification Format section (lines 69–82) header to say "Notification Format" instead of implying Discord.  
- **New test?** No — this is a doc-only fix.

### C2. SPEC.md report output path uses `YYYYMMDD.md` but implementation uses `YYYY-MM-DD.md`
- **File:** `psg/automation/SPEC.md`, line 48  
- **What's wrong:** SPEC says `reports/YYYYMMDD.md` but `reporter.py` line 258 (`self.config.reports_dir / f"{report.date}.md"`) uses `report.date` which is `YYYY-MM-DD` format (set at line 96: `datetime.now().strftime("%Y-%m-%d")`). The test at `test_psg_automation_reporter.py:546` verifies `reports/2026-01-15.md` not `reports/20260115.md`. This is a format conflict in SPEC.  
- **Fix:** Update SPEC.md line 48 to say `reports/YYYY-MM-DD.md` to match implementation.  
- **New test?** No — already tested at reporter test 19.

### C3. SPEC.md tester output says `auto_YYYYMMDD_MODEL.json` but code produces `auto_MODEL_YYYYMMDD.json`
- **File:** `psg/automation/SPEC.md`, line 40  
- **What's wrong:** SPEC says output is `results/auto_YYYYMMDD_MODEL.json`, but `tester.py` line 122 computes `{output_prefix}_{model_safe}_{timestamp}` which produces `auto_llama3_8b_20260101.json` (MODEL then DATE).  
- **Fix:** Decide on canonical order and update either SPEC or code. Given the code is already in production with tests, update SPEC line 40 to `results/auto_MODEL_YYYYMMDD.json`.  
- **New test?** Add a test in `test_psg_automation_tester.py` verifying the exact output filename format matches `auto_<model>_<date>.json`. The existing test 16 (`test_run_test_output_path_in_results_dir`) doesn't verify the exact naming convention.

### C4. Validation bypass: `validate_url` dangerous_patterns checked after scheme validation is redundant and can be bypassed
- **File:** `psg/automation/validation.py`, lines 103–113  
- **What's wrong:** The `dangerous_patterns` list includes `javascript:`, `data:`, `file:`, `ftp:` but these are checked by substring match on the URL *after* `urlparse` already validated `parsed.scheme` at lines 77–78. If `urlparse` parses `https://evil.com/javascript:alert(1)` as scheme `https`, the dangerous pattern check would block a valid HTTPS URL that happens to contain `javascript:` in the path. Meanwhile, `file:` URLs are already blocked by the scheme check. The `ftp:` check is also redundant since `parsed.scheme not in ("http", "https")` catches it. The real risk is `javascript:` appearing *in the path* causing false positives. Additionally, `data:` as a substring could falsely match e.g. `https://example.com/database`.  
- **Fix:** Remove the redundant `dangerous_patterns` block (lines 103–113) since the scheme check on lines 77–78 already blocks `javascript:`, `data:`, `file:`, `ftp:` URLs at the scheme level. This eliminates both the redundancy and the false-positive risk.  
- **New test?** Add test: `test_validate_url_allows_https_path_containing_javascript_substring` — verify `https://example.com/javascript-tutorial` passes. Add test: `test_validate_url_allows_https_path_containing_data_substring` — verify `https://example.com/database` passes.

### C5. SSRF fix incomplete: `validate_url` allows `localhost` by blocklist but not `127.0.0.1` resolved via DNS rebinding
- **File:** `psg/automation/validation.py`, lines 88–101  
- **What's wrong:** The `BLOCKED_HOSTS` set includes `"localhost"` and `"127.0.0.1"`, but a hostname like `localtest.me` or `spoofed.bypassnetworks.com` that DNS-resolves to `127.0.0.1` would be caught by the DNS resolution check (lines 93–101). However, the `_resolve_host_ips` function (line 139) is called with `parsed.port` which could be None, and the fallback to port 443 might not match the actual URL port, potentially missing some A/AAAA records. This is acceptable for defensive purposes but should be documented. More critically, if DNS resolution returns an empty set (e.g., DNS timeout), the function returns `False` (line 98), which prevents the URL from being accessed. This is the correct safe-default behavior, but it means legitimate URLs with transient DNS failures are permanently blocked.  
- **Fix:** Add a docstring note to `validate_url` explaining that DNS-failing URLs are rejected (safe default). No code change needed for the logic — it's correct.  
- **New test?** Add test: `test_validate_url_rejects_when_dns_resolution_fails` (already partially covered by `test_validate_url_blocks_if_any_resolved_ip_is_private`, but add explicit test for `getaddrinfo` raising `OSError`).

---

## IMPORTANT (Should Fix)

### I1. `reporter.py` has unused import `json`
- **File:** `psg/automation/reporter.py`, line 12  
- **What's wrong:** `import json` is imported but never used in the file. No `json.loads()`, `json.dumps()`, or `json` reference exists in reporter.py.  
- **Fix:** Remove `import json` from line 12.  
- **New test?** No — unused import removal.

### I2. `reporter.py` docstring still references "Discord"
- **File:** `psg/automation/reporter.py`, line 72  
- **What's wrong:** The `create_report` docstring says "Discord / markdown formatting" but Discord was removed in Run 2. The correct term is "summary notification / markdown formatting".  
- **Fix:** Change line 72 from `Discord / markdown formatting` to `summary notification / markdown formatting`.  
- **New test?** No — docstring only.

### I3. `tester.py` imports `subprocess` redundantly inside methods
- **File:** `psg/automation/tester.py`, lines 59, 85  
- **What's wrong:** `subprocess` is already imported at the top of the file (line 8), but `import subprocess` is repeated inside `check_ollama()` (line 59) and `get_available_models()` (line 85). These are dead redundant imports.  
- **Fix:** Remove the local `import subprocess` from lines 59 and 85.  
- **New test?** No — dead code removal.

### I4. `logging_config.py` module docstring says "auto_pipeline" but module is `psg.automation`
- **File:** `psg/automation/logging_config.py`, line 1  
- **What's wrong:** Docstring says `"""Logging configuration for auto_pipeline."""` but the module path is `psg.automation.logging_config`. The name should be consistent.  
- **Fix:** Change to `"""Logging configuration for psg.automation."""`  
- **New test?** No — docstring only.

### I5. `validation.py` module docstring says "auto_pipeline" but module is `psg.automation.validation`
- **File:** `psg/automation/validation.py`, line 1  
- **What's wrong:** Docstring says `"""Input validation for auto_pipeline."""`  
- **Fix:** Change to `"""Input validation for psg.automation."""`  
- **New test?** No — docstring only.

### I6. `sanitize_filename` is defined but never used in the codebase
- **File:** `psg/automation/validation.py`, lines 159–173  
- **What's wrong:** `sanitize_filename()` is defined and tested (in `test_psg_automation_validation.py`) but never called by any module in `psg/automation/`. It was likely intended for sanitizing report filenames or test output filenames but was never wired in.  
- **Fix:** Either (a) wire it into the reporter's `save_report` or tester's `run_test` output path generation, or (b) remove it. Since it's tested and could be useful for future filename generation, recommend (a): use it in `reporter.py:save_report` to sanitize the date string (defensive hardening).  
- **New test?** If wiring it in: no new test — existing `sanitize_filename` tests cover it. If removing: remove corresponding tests too.

### I7. `config.py:174` has a bare `print()` in `__main__` block
- **File:** `psg/automation/config.py`, line 174  
- **What's wrong:** Known issue from previous runs — `print(f"Config loaded: {cfg}")` in the `__main__` block. While this is acceptable for CLI usage, the output could be noisy and the dataclass `__repr__` leaks all config values (including paths).  
- **Fix:** Use `logger.info` instead if possible, or leave as-is since it's in `__main__` guard. Low risk but noted for cleanup.  
- **New test?** No.

### I8. `fetch_page_content` in `discovery.py` has an inline `requests` import fallback with no rate limiting
- **File:** `psg/automation/discovery.py`, lines 125–180  
- **What's wrong:** The `fetch_page_content` function:  
  1. Is never called by any pipeline code (not used by `DiscoveryEngine.discover()` or any other path). The `Source` dataclass only stores `snippet` from the search API response.  
  2. The fallback `requests.get()` call has no SSL verification override and uses a generic `Mozilla/5.0` user agent.  
  3. The `HTMLParser` class `TextExtractor` is defined inside the function on every call — it should be module-level.  
- **Fix:** Mark `fetch_page_content` as dead code. If it's intended for future use (fetching page content to generate better vectors), add a `# TODO:` comment. Move `TextExtractor` to module level if keeping. If not intended for use, remove the entire function.  
- **New test?** No existing tests for `fetch_page_content`. If keeping, add basic tests. If removing, no tests needed.

### I9. SPEC says "Rank by relevance/novelty" for discovery but no ranking exists
- **File:** `psg/automation/SPEC.md`, line 20  
- **What's wrong:** SPEC says discovery should "Rank by relevance/novelty" but `DiscoveryEngine.discover()` just appends results in search order. There is no relevance scoring or novelty ranking.  
- **Fix:** Either add basic relevance scoring (e.g., keyword matching against query terms) or update SPEC to mark this as "future enhancement" / note that search API ranking is used as proxy.  
- **New test?** If adding scoring: yes, add tests. If updating SPEC: no.

### I10. SPEC says "Parse top 10 results per query" but config defaults to `max_sources_per_query: 5`
- **File:** `psg/automation/SPEC.md`, line 19 vs `psg/automation/config.py`, line 26  
- **What's wrong:** SPEC says "Parse top 10 results per query" but config's `max_sources_per_query` defaults to 5.  
- **Fix:** Either update SPEC to match code ("Parse top N results per query, where N defaults to 5") or update config default to 10.  
- **New test?** If changing config default: update `test_default_config_has_search_queries` to check the new value. If updating SPEC: no.

### I11. SPEC says "Web search (3-5 queries)" but config defaults to 3 queries
- **File:** `psg/automation/SPEC.md`, line 18 vs `psg/automation/config.py`, lines 19–25  
- **What's wrong:** SPEC says "3-5 queries" but config ships exactly 3 queries. This is at the lower bound but technically within range. However, the SPEC implies variability is expected.  
- **Fix:** Accept as-is (3 is within 3-5 range) or update SPEC to say "3 default queries, configurable up to 5".  
- **New test?** No.

### I12. Test file references "Discord" in test names and docstrings — should use "summary notification"
- **File:** `tests/test_psg_automation_reporter.py`, lines 169–529  
- **What's wrong:** Multiple test names include `discord`: `test_discord_spec_format_flagged_warning`, `test_discord_spec_format_no_warning_when_zero`, `test_discord_top_findings_limited_to_three`, `test_discord_message_technique_format_when_available`, `test_discord_message_falls_back_to_model_format_no_techniques`, `test_discord_message_path_matches_saved_report`. These test the `generate_summary_message` output, not a Discord webhook.  
- **Fix:** Rename test functions from `test_discord_*` to `test_summary_message_*`. Update docstrings to say "summary notification message" instead of "Discord message".  
- **New test?** No — just renaming existing tests.

---

## MINOR (Nice to Have)

### M1. `__init__.py` exports deprecated aliases `TestRunner` and `TestResult`
- **File:** `psg/automation/__init__.py`, lines 10–12, 27–28  
- **What's wrong:** `TestRunner = PipelineTester` and `TestResult = ModelTestResult` are backward-compat aliases. No code in the codebase uses these aliases. They add cognitive overhead.  
- **Fix:** Add a deprecation warning using `warnings.warn()` when these are accessed, or remove them entirely. If removing, also remove from `__all__`.  
- **New test?** If adding deprecation warnings: add test that warns are emitted. If removing: no.

### M2. `dedup.py` `__main__` block uses `tempfile.NamedTemporaryFile(delete=False)` without cleanup
- **File:** `psg/automation/dedup.py`, lines 79–90  
- **What's wrong:** The `__main__` self-test creates a temp file with `delete=False` and never cleans it up.  
- **Fix:** Add `import os; os.unlink(f.name)` at the end, or use `delete=True` (though that may not work on all platforms when the file is opened).  
- **New test?** No — `__main__` block only.

### M3. `daily_check.py` uses `print()` instead of `logger`
- **File:** `psg/automation/daily_check.py`, lines 194, 199, 206, 212  
- **What's wrong:** `mark()` (line 194) and `main()` (lines 199, 206, 212) use `print()` instead of the logging system. The rest of the pipeline uses the logger.  
- **Fix:** Replace `print()` calls in `mark()` and `main()` with `logger.info()` / `logger.warning()`. Import logger from `logging_config`.  
- **New test?** No.

### M4. Shell script `run_auto_test.sh` is written to `base_dir` — could conflict
- **File:** `psg/automation/tester.py`, lines 237–240  
- **What's wrong:** `run_in_tmux()` writes a shell script to `config.base_dir / "run_auto_test.sh"`. This is in the source directory. If multiple pipelines run concurrently, they'd overwrite each other's script. Also, the script is never cleaned up.  
- **Fix:** Write to `config.results_dir` or `config.logs_dir` instead of `base_dir`. Add script cleanup after tmux session completes (or at least in a finally block).  
- **New test?** Update `test_run_in_tmux_writes_script_to_base_dir` in tester tests if changing script location.

### M5. `tester.py` tmux script doesn't capture exit codes or detect failures
- **File:** `psg/automation/tester.py`, lines 220–234  
- **What's wrong:** The generated shell script uses `for MODEL in ...; do` loop but doesn't check exit codes. If one model test fails, the script continues to the next model (desired behavior per SPEC), but there's no summary of which models failed. The `=== ALL TESTS COMPLETE ===` marker doesn't indicate success/failure.  
- **Fix:** Add exit code tracking in the script (per-model pass/fail echoed) so the caller can determine which models succeeded.  
- **New test?** Add test verifying the generated script includes per-model exit code handling.

### M6. `config.py` `load_config` doesn't validate YAML types
- **File:** `psg/automation/config.py`, lines 163–169  
- **What's wrong:** If YAML provides `max_vectors_per_run: "hello"` (string instead of int), `PipelineConfig(**data)` will raise `TypeError` at dataclass construction — which is fine but the error message will be confusing ("cannot convert 'hello' to int"). No pre-validation is done.  
- **Fix:** Add basic type checking in `load_config()` before constructing `PipelineConfig`, or wrap with a better error message.  
- **New test?** Add test: `test_load_config_wrong_type_raisesTypeError`.

### M7. `discovery.py` `retry` decorator catches ALL exceptions — could mask programming errors
- **File:** `psg/automation/discovery.py`, lines 43–64  
- **What's wrong:** The `retry` decorator catches all `Exception` subclasses, including `TypeError`, `KeyError`, etc. which are programming errors and should not be retried.  
- **Fix:** Be more specific: catch `subprocess.SubprocessError`, `ConnectionError`, `TimeoutError`, `OSError` etc. Or at minimum exclude `TypeError`, `ValueError`, `KeyError`, `AttributeError`.  
- **New test?** Add test that `TypeError` is NOT retried (immediately raised).

### M8. `logging_config.py` module-level `logger = setup_logging()` runs at import time
- **File:** `psg/automation/logging_config.py`, line 43  
- **What's wrong:** The module-level `logger = setup_logging()` means importing this module creates a logger with a console handler. This can conflict with test loggers or create duplicate handlers in some scenarios.  
- **Fix:** This is a common Python pattern and acceptable, but document that importing this module has the side effect of configuring logging.  
- **New test?** No — existing tests cover this.

### M9. `main.py` `Pipeline.__init__` uses untyped `Callable` for `search_func` and `generate_func`
- **File:** `psg/automation/main.py`, lines 25–26  
- **What's wrong:** `search_func: Callable | None` and `generate_func: Callable | None` — missing type parameters. `discovery.py` defines `SearchFunc = Callable[[str, int], list[dict[str, str]]]` and `generator.py` defines `GenerateFunc = Callable[[str], str]`. These specific types should be used.  
- **Fix:** Import and use `SearchFunc` and `GenerateFunc` from their respective modules in `main.py`.  
- **New test?** No — type-only improvement.

### M10. `main.py` `_run_full_impl` return type `PipelineReport | dict | None` is complex
- **File:** `psg/automation/main.py`, lines 125, 139  
- **What's wrong:** The three-type union `PipelineReport | dict | None` is hard for callers to handle correctly. The `dict` case (tmux background mode) could be a proper dataclass.  
- **Fix:** Define a `TmuxSession` dataclass for the background mode return value, making the return type `PipelineReport | TmuxSession | None`.  
- **New test?** Update existing tmux-return test to check for dataclass fields.

### M11. `codex_task.md` is an AI task prompt file that should not be in the source tree
- **File:** `psg/automation/codex_task.md`  
- **What's wrong:** This is a Codex/AI task prompt file from the initial implementation. It's not documentation or configuration — it's AI slop.  
- **Fix:** Delete `psg/automation/codex_task.md`.  
- **New test?** No.

### M12. Stale `sources_*.json` files in `psg/automation/` directory
- **File:** `psg/automation/sources_20260317.json` through `sources_20260325.json` (9 files)  
- **What's wrong:** These are output data files from previous pipeline runs that are sitting in the source directory. They should be in the configured `datasets_dir` or cleaned up.  
- **Fix:** Move them to the appropriate `datasets_dir` if still needed, or delete them. Add `sources_*.json` to `.gitignore` in the automation directory.  
- **New test?** No.

### M13. `run_auto_test.sh` is a stale generated file in source directory
- **File:** `psg/automation/run_auto_test.sh`  
- **What's wrong:** This is a generated shell script from `run_in_tmux()` that's been committed/left in the source directory.  
- **Fix:** Delete it and add `run_auto_test.sh` to `.gitignore` in the automation directory.  
- **New test?** No.

### M14. Missing test: `validate_environment` in config.py
- **File:** `psg/automation/config.py`, lines 136–160  
- **What's wrong:** `validate_environment()` is called by `main.py:236` but has no direct test coverage. The existing test `test_load_config_*` files don't test this function.  
- **Fix:** Add tests for `validate_environment()` in `test_psg_automation_config.py`:  
  - Test that it raises `RuntimeError` when scrapling_python doesn't exist  
  - Test that it raises `RuntimeError` when scrapling import fails  
  - Test that it passes when scrapling_python is valid  
- **New test?** Yes — 3 new tests needed.

### M15. Missing test: `fetch_page_content` in discovery.py (if keeping)
- **File:** `psg/automation/discovery.py`, lines 125–180  
- **What's wrong:** No tests exist for this function. If it's meant to stay, it needs test coverage. If it's dead code, it should be removed.  
- **Fix:** See I8 — decide keep vs remove. If keeping, add tests.  
- **New test?** If keeping: add 3+ tests (mock subprocess, mock requests, invalid URL).

### M16. Missing test: `default_search_func` in discovery.py
- **File:** `psg/automation/discovery.py`, lines 116–122  
- **What's wrong:** `default_search_func` creates a config and delegates to `create_search_func`. No test coverage.  
- **Fix:** Add test mocking `load_config` and subprocess.  
- **New test?** Yes — 1 test.

### M17. SPEC says `config.yaml` but implementation supports arbitrary path
- **File:** `psg/automation/SPEC.md`, line 58  
- **What's wrong:** SPEC says config file is `config.yaml` but `load_config` takes an arbitrary path and defaults to constructing `PipelineConfig()` if no path given. There's no default `config.yaml` lookup.  
- **Fix:** Either update SPEC to clarify that config is optional with defaults, or add `config.yaml` auto-lookup in `load_config`.  
- **New test?** If adding auto-lookup: add test for it.

### M18. SPEC section "Error Handling" says "If web search fails → use cached sources" 
- **File:** `psg/automation/SPEC.md`, lines 60–63  
- **What's wrong:** The code in `main.py:run_discovery()` (lines 47–54) implements this fallback correctly. However, the SPEC says "If Ollama down → notify + skip testing" which is implemented at `main.py:88-90` (returns empty list). The "notify" part is just `logger.error()` — not an external notification. SPEC should clarify this.  
- **Fix:** Update SPEC line 61 to say "If Ollama down → log error + skip testing".  
- **New test?** No.

### M19. SPEC says "If model missing → skip that model, continue others"
- **File:** `psg/automation/SPEC.md`, line 62  
- **What's wrong:** This is correctly implemented in `tester.py:200-203` (`if model not in available`). However, `main.py:_run_full_impl()` doesn't handle the case where *all* models are missing — `results` would be empty, which leads to `report` with `models_tested=0`. This is technically correct but could be surprising.  
- **Fix:** Add a warning log when all models are skipped/missing.  
- **New test?** Add test for "all models unavailable" scenario in `test_psg_automation_main.py`.

### M20. `__init__.py` doesn't export `daily_check` or `validation` modules
- **File:** `psg/automation/__init__.py`  
- **What's wrong:** `daily_check.py` and `validation.py` are not re-exported from the package `__init__.py`. Users must import them directly. This is a minor API consistency issue.  
- **Fix:** Either add exports or document that these are internal utility modules.  
- **New test?** No.

---

## Summary Statistics

| Priority | Count | New Tests Needed |
|----------|-------|-----------------|
| Critical | 5     | 4               |
| Important| 12    | 0               |
| Minor    | 20    | 6               |
| **Total**| **37**| **10**          |

### Key SPEC-to-Code Discrepancies
1. Discord references in SPEC (C1) — **3 instances in SPEC + 1 in reporter.py + 7+ in tests**
2. Report path format: `YYYYMMDD` vs `YYYY-MM-DD` (C2)
3. Tester output naming: `auto_YYYYMMDD_MODEL` vs `auto_MODEL_YYYYMMDD` (C3)
4. Discovery ranking: SPEC says "rank by relevance/novelty" but no ranking exists (I9)
5. Results per query: SPEC says "10" but config defaults to "5" (I10)
6. Web search queries: SPEC says "3-5" but config ships exactly 3 (I11)
7. Error notification: SPEC says "notify" but code just logs (M18)

### Dead Code / AI Slop
1. `codex_task.md` — AI task prompt (M11)
2. `fetch_page_content()` — never called (I8)
3. `sanitize_filename()` — defined but never used (I6)
4. Redundant `import subprocess` in tester methods (I3)
5. Unused `import json` in reporter.py (I1)
6. Stale output files in source directory (M12, M13)
7. Deprecated aliases `TestRunner`/`TestResult` (M1)

### Security Issues
1. `validate_url` dangerous_patterns block causes false positives and is redundant (C4)
2. `retry` decorator catches ALL exceptions including programming errors (M7)
3. Shell script `run_auto_test.sh` written to source directory (M4)
4. DNS resolution safe-default not documented (C5)