# Claude Model Downgrade Detector

A behavioral fingerprinting tool that detects potential silent model substitution in Claude API responses. Built in response to community-reported incidents of Claude Opus 4.6 quality regressions in early 2026.

## Background

Between February and April 2026, multiple users reported that Claude Opus 4.6 responses degraded in quality without any official announcement from Anthropic. Reports included:

- Production automation pipelines producing incoherent results consistent with lower-tier models ([GitHub Issue #31480](https://github.com/anthropics/claude-code/issues/31480))
- A documented 58% performance drop on multi-part tasks after a backend change
- Silent routing of Opus requests to Haiku-tier models ([GitHub Issue #19468](https://github.com/anthropics/claude-code/issues/19468))
- Behavioral degradation with confident but unverified analysis patterns ([GitHub Issue #30027](https://github.com/anthropics/claude-code/issues/30027))

This tool provides an empirical, repeatable method to verify whether the model you are being served matches the model you requested.

## How It Works

The detector runs four categories of behavioral probes against the target model, then compares the results to stored baselines for each known model tier (Opus, Sonnet, Haiku).

### Probe Categories

**1. Latency Profiling (weight: 20%)**

Measures time-to-first-token (TTFT) and word generation throughput using the streaming API. A warm-up request is sent first to eliminate connection setup overhead (TLS, DNS, TCP) from measurements. Different model sizes have fundamentally different inference costs:

- Opus: Higher TTFT (800-3000ms), lower throughput
- Sonnet: Medium TTFT (400-1800ms), medium throughput
- Haiku: Low TTFT (150-800ms), high throughput

Latency is weighted lowest because it is most affected by external factors (network, server load, geographic region). The throughput metric is measured in words per second (whitespace-split), not tokens, because the streaming API does not expose token counts mid-stream.

**2. Multi-Step Reasoning (weight: 35%)**

Tests the model with 15 verifiable logic and math problems that require genuine multi-step reasoning:

- Modular arithmetic, combinatorics, GCD/LCM, base conversion
- Knights-and-knaves logic, syllogisms, boolean evaluation
- Probability, geometry, series sums
- Deductive puzzles, word problems

Every expected answer has been manually verified with inline derivations in the source code. Answer matching uses exact comparison (case-insensitive) with a list of acceptable answer forms -- no substring matching.

**3. Instruction Compliance (weight: 25%)**

Tests how precisely the model follows complex, multi-constraint prompts. Each probe defines specific formatting rules and programmatically validates each constraint against the specific sentence or line it applies to (not the full text). Higher-tier models consistently satisfy more constraints simultaneously.

**4. Linguistic Fingerprint (weight: 20%)**

Measures vocabulary richness (type-token ratio) and sentence structure in controlled writing prompts. All prompts request the same target word count (150 words) to avoid the known problem where TTR naturally decreases with text length.

### Scoring Algorithm

For each model tier, the analyzer:

1. Computes a per-category score (0.0-1.0) based on range membership AND proximity to the tier's typical value. This two-part approach resolves ambiguity when tier ranges overlap.
2. Applies category weights (redistributed to exclude any skipped probes) to produce an aggregate tier score.
3. Selects the tier with the highest score as the detected tier.
4. Computes match strength from the normalized gap between the top two scores.

If the detected tier does not match the requested model's tier, a mismatch is flagged.

**Important:** The "match strength" metric is a heuristic score gap, NOT a statistical confidence measure. It has no p-value, confidence interval, or hypothesis test behind it.

## Installation

```bash
cd Model_Downgrade_Detector
pip install -r requirements.txt
export ANTHROPIC_API_KEY="your-key-here"
```

## Calibration (required before first use)

The default baselines in `baselines.json` are **uncalibrated placeholders**. They are rough estimates, not empirical measurements. You must calibrate before trusting any detection results:

```bash
python run_detection.py --model claude-opus-4-6 --calibrate
python run_detection.py --model claude-sonnet-4-6 --calibrate
python run_detection.py --model claude-haiku-4-5-20251001 --calibrate
```

Review the output in `results/` and update `baselines.json` with the observed ranges from your environment.

## Usage

### Basic Detection

```bash
python run_detection.py --model claude-opus-4-6
```

### Increased Statistical Confidence

```bash
python run_detection.py --model claude-opus-4-6 --latency-iterations 5
```

### Skip Unreliable Probes

If your network introduces significant latency variance:

```bash
python run_detection.py --model claude-opus-4-6 --skip-latency
```

When probes are skipped, their weights are redistributed proportionally across active probes.

### Quiet Mode

Suppress progress and detail output. Prints only the final verdict:

```bash
python run_detection.py --model claude-opus-4-6 --quiet
```

### Save Results for Historical Tracking

```bash
python run_detection.py --model claude-opus-4-6 --output results/daily_check.json
```

### CI/CD Integration

The tool exits with code 1 when a tier mismatch is detected, making it suitable for pipeline gates:

```bash
python run_detection.py --model claude-opus-4-6 --quiet || echo "MISMATCH ALERT"
```

## Output

The tool produces:

1. **Console output** with a structured report including raw probe data, per-tier scores, and a final verdict.
2. **JSON file** in `results/` containing both the raw probe data and the analysis verdict for historical comparison and auditing.

### Example Verdict

```
============================================================
  DETECTION VERDICT
============================================================

  *** TIER MISMATCH DETECTED ***

  Requested model  : claude-opus-4-6
  Detected tier    : sonnet
  Detected model   : claude-sonnet-4-6
  Match strength   : 34.12%

--- Tier Match Scores ---
  claude-sonnet-4-6                    0.8234 <-- best match
  claude-opus-4-6                      0.5421
  claude-haiku-4-5-20251001            0.3102
```

## File Structure

```
Model_Downgrade_Detector/
    run_detection.py    # CLI entry point and orchestrator
    probes.py           # Probe definitions and execution logic
    analyzer.py         # Statistical analysis and scoring engine
    baselines.json      # Reference measurements per model tier (CALIBRATE FIRST)
    requirements.txt    # Python dependencies
    README.md           # This file
    results/            # Auto-created directory for output JSON files
```

## Limitations

This tool provides evidence-based analysis, not proof. The following limitations apply:

1. **Baselines are uncalibrated by default.** The shipped `baselines.json` contains placeholder values, not empirical measurements. Detection results are meaningless until you calibrate against each model tier in your own environment.

2. **Latency is environment-dependent.** Network conditions, geographic region, API plan tier, and server load all affect timing measurements. Even with warm-up requests and median aggregation, latency remains the noisiest signal.

3. **Match strength is not statistical confidence.** The metric is a heuristic score gap between tier matches. It is not a p-value, confidence interval, or any recognized statistical measure. Do not interpret it as a probability.

4. **Cannot distinguish downgrade from update.** The tool detects when behavior does not match expected baselines. It cannot determine whether this is due to silent model substitution, a backend regression, or a deliberate model update.

5. **Reasoning probes are finite.** The current set contains 15 problems. A model could theoretically be fine-tuned to pass these specific tests. Periodically adding new probes is recommended.

6. **No historical trend analysis.** Results are saved as JSON files but the tool does not include code to load and compare past results. Drift detection over time must be done manually or with external tooling.

7. **API cost.** Each full run makes approximately 25-30 API calls (including warm-up). At Opus pricing, this is non-trivial. Use `--skip-*` flags to reduce cost when specific probe categories are not needed.

8. **Single-run variance.** Individual runs can produce noisy results. For high-confidence detection, run the tool multiple times and compare results.

## License

MIT
