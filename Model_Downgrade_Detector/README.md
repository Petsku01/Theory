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

Measures time-to-first-token (TTFT) and token generation throughput using the streaming API. Different model sizes have fundamentally different inference costs:

- Opus: Higher TTFT (800-3000ms), lower throughput (15-50 tok/s)
- Sonnet: Medium TTFT (400-1800ms), medium throughput (40-100 tok/s)
- Haiku: Low TTFT (150-800ms), high throughput (80-200 tok/s)

Latency is weighted lowest because it is most affected by external factors (network, server load, geographic region).

**2. Multi-Step Reasoning (weight: 35%)**

Tests the model with verifiable logic and math problems that require genuine multi-step reasoning:

- Modular arithmetic
- Knights-and-knaves logic puzzles
- Probability calculations
- Sequence prediction
- Word problems

Each problem has a known correct answer. Reasoning accuracy correlates strongly with model tier and is the highest-weighted signal.

**3. Instruction Compliance (weight: 25%)**

Tests how precisely the model follows complex, multi-constraint prompts. Each probe defines specific formatting rules (word counts, required patterns, structural constraints) and programmatically validates each constraint. Higher-tier models consistently satisfy more constraints simultaneously.

**4. Linguistic Fingerprint (weight: 20%)**

Measures vocabulary richness (type-token ratio) and sentence structure in controlled writing prompts. Larger models tend to exhibit:

- Higher lexical diversity
- More varied sentence structure
- More precise word count adherence

### Scoring Algorithm

For each model tier, the analyzer:

1. Computes a per-category score (0.0-1.0) based on how well the observed values fall within the tier's expected range.
2. Applies category weights to produce an aggregate tier score.
3. Selects the tier with the highest score as the detected tier.
4. Computes confidence from the gap between the top two scores.

If the detected tier does not match the requested model's tier, a downgrade is flagged.

## Installation

```bash
cd Model_Downgrade_Detector
pip install -r requirements.txt
export ANTHROPIC_API_KEY="your-key-here"
```

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

### Calibration Mode

Run against a model you trust to collect baseline data. Use this to replace the default baselines with measurements from your own environment:

```bash
python run_detection.py --model claude-opus-4-6 --calibrate
python run_detection.py --model claude-sonnet-4-6 --calibrate
python run_detection.py --model claude-haiku-4-5-20251001 --calibrate
```

Review the output in `results/` and update `baselines.json` accordingly.

### Save Results for Historical Tracking

```bash
python run_detection.py --model claude-opus-4-6 --output results/daily_check.json
```

### CI/CD Integration

The tool exits with code 1 when a downgrade is detected, making it suitable for pipeline gates:

```bash
python run_detection.py --model claude-opus-4-6 --quiet || echo "DOWNGRADE ALERT"
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

  *** POTENTIAL DOWNGRADE DETECTED ***

  Requested model : claude-opus-4-6
  Detected tier   : sonnet
  Detected model  : claude-sonnet-4-6
  Confidence      : 34.12%

--- Tier Match Scores ---
  claude-sonnet-4-6                 0.8234 <-- best match
  claude-opus-4-6                   0.5421
  claude-haiku-4-5                  0.3102
```

## File Structure

```
Model_Downgrade_Detector/
    run_detection.py    # CLI entry point and orchestrator
    probes.py           # Probe definitions and execution logic
    analyzer.py         # Statistical analysis and scoring engine
    baselines.json      # Reference measurements per model tier
    requirements.txt    # Python dependencies
    README.md           # This file
    results/            # Auto-created directory for output JSON files
```

## Limitations

This tool provides evidence-based analysis, not proof. The following limitations apply:

1. **Latency is environment-dependent.** Network conditions, geographic region, API plan tier, and server load all affect timing measurements. Always calibrate baselines for your own environment.

2. **Baselines require maintenance.** Anthropic may update model behavior (improvements or regressions) without changing the model ID. Baselines should be periodically recalibrated.

3. **Single-run variance.** Individual runs can produce noisy results. For high-confidence detection, run the tool multiple times and compare results, or increase `--latency-iterations`.

4. **Reasoning probes are finite.** The current probe set contains 5 reasoning problems. A model could theoretically be fine-tuned to pass these specific tests while being degraded elsewhere. Periodically adding new probes is recommended.

5. **Cannot distinguish downgrade from degradation.** The tool detects when behavior does not match expected baselines. It cannot determine whether this is due to silent model substitution, a backend regression, or a deliberate model update.

6. **API cost.** Each full run makes approximately 15-20 API calls. At Opus pricing, this is non-trivial. Use `--skip-*` flags to reduce cost when specific probe categories are not needed.

## License

MIT
