"""
probes.py -- Probe definitions for Claude model downgrade detection.

Each probe is a self-contained test that measures a specific behavioral
characteristic of the model. The core assumption is that different model
tiers (Opus, Sonnet, Haiku) produce measurably different outputs across
these dimensions:

    1. Latency (time-to-first-token, tokens/second)
    2. Reasoning depth (multi-step logic correctness)
    3. Instruction compliance (adherence to complex constraints)
    4. Linguistic fingerprint (vocabulary richness, response structure)

Probes return structured results that the analyzer compares against
known baselines for each model tier.

Author: Petteri Kosonen
License: MIT
"""

import time
import re
from dataclasses import dataclass, field, asdict
from typing import Optional

import anthropic


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class LatencyResult:
    """Raw timing data from a single API call."""
    ttft_ms: float              # Time to first token (milliseconds)
    total_time_ms: float        # Wall-clock time for full response
    output_tokens: int          # Number of tokens in the response
    tokens_per_second: float    # Derived throughput


@dataclass
class ReasoningResult:
    """Result from a single reasoning probe."""
    probe_id: str               # Identifier for the specific problem
    expected_answer: str        # Known correct answer
    model_answer: str           # What the model returned
    is_correct: bool            # Whether the model got it right
    response_text: str          # Full response for inspection


@dataclass
class ComplianceResult:
    """Result from an instruction compliance probe."""
    probe_id: str
    constraints_total: int      # Number of constraints in the prompt
    constraints_met: int        # Number the model satisfied
    compliance_ratio: float     # constraints_met / constraints_total
    violations: list            # Descriptions of which constraints failed


@dataclass
class LinguisticResult:
    """Linguistic analysis of a model response."""
    probe_id: str
    word_count: int
    unique_words: int
    type_token_ratio: float     # unique_words / word_count
    avg_sentence_length: float  # Words per sentence
    response_text: str


@dataclass
class ProbeResults:
    """Aggregated results from all probes in a single run."""
    timestamp: str
    model_requested: str
    latency: list = field(default_factory=list)
    reasoning: list = field(default_factory=list)
    compliance: list = field(default_factory=list)
    linguistic: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# API interaction helpers
# ---------------------------------------------------------------------------

def _stream_response(
    client: anthropic.Anthropic,
    model: str,
    prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.0,
) -> tuple[str, LatencyResult]:
    """
    Send a prompt via the streaming API and collect timing data.

    Uses streaming to measure time-to-first-token (TTFT) accurately.
    TTFT is the primary latency signal for distinguishing model tiers
    because larger models require more computation before producing
    the first output token.

    Args:
        client:     Authenticated Anthropic client.
        model:      Model identifier string (e.g. "claude-opus-4-6").
        prompt:     The user message to send.
        max_tokens: Maximum tokens in the response.
        temperature: Sampling temperature. 0.0 for deterministic probes.

    Returns:
        Tuple of (response_text, LatencyResult).
    """
    chunks = []
    ttft = None
    start = time.perf_counter()

    with client.messages.stream(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            if ttft is None:
                ttft = (time.perf_counter() - start) * 1000  # ms
            chunks.append(text)

    total_time = (time.perf_counter() - start) * 1000  # ms
    full_text = "".join(chunks)

    # Token count approximation: split on whitespace and punctuation.
    # This is intentionally simple. For precise counts, use the API's
    # usage field, but that is not available mid-stream in all SDK versions.
    output_tokens = len(full_text.split())

    tps = (output_tokens / (total_time / 1000)) if total_time > 0 else 0

    latency = LatencyResult(
        ttft_ms=ttft if ttft is not None else total_time,
        total_time_ms=total_time,
        output_tokens=output_tokens,
        tokens_per_second=round(tps, 2),
    )
    return full_text, latency


def _simple_request(
    client: anthropic.Anthropic,
    model: str,
    prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.0,
) -> str:
    """
    Non-streaming request for probes where timing is not critical.

    Args:
        client:     Authenticated Anthropic client.
        model:      Model identifier string.
        prompt:     The user message to send.
        max_tokens: Maximum tokens in the response.
        temperature: Sampling temperature.

    Returns:
        The model's text response.
    """
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


# ---------------------------------------------------------------------------
# Probe 1: Latency profiling
# ---------------------------------------------------------------------------

# These prompts are deliberately simple to isolate model inference speed
# from task complexity. The goal is to measure raw throughput.
LATENCY_PROMPTS = [
    "List the first 20 prime numbers, one per line.",
    "Write a short paragraph about the history of cryptography.",
    "Explain the difference between symmetric and asymmetric encryption in exactly five sentences.",
]


def run_latency_probes(
    client: anthropic.Anthropic,
    model: str,
    iterations: int = 2,
) -> list[LatencyResult]:
    """
    Measure latency characteristics across multiple prompts and iterations.

    Runs each prompt multiple times to account for variance from network
    conditions and server-side batching. The statistical analysis layer
    uses medians rather than means to reduce the impact of outliers.

    Args:
        client:     Authenticated Anthropic client.
        model:      Model identifier to test.
        iterations: Number of times to repeat each prompt.

    Returns:
        List of LatencyResult objects.
    """
    results = []
    for prompt in LATENCY_PROMPTS:
        for _ in range(iterations):
            _, latency = _stream_response(client, model, prompt, max_tokens=512)
            results.append(latency)
    return results


# ---------------------------------------------------------------------------
# Probe 2: Multi-step reasoning
# ---------------------------------------------------------------------------

# Each entry: (probe_id, prompt, expected_answer_substring)
#
# These problems are chosen because they require genuine multi-step
# reasoning that correlates with model capability tier. The expected
# answers are mathematically or logically verifiable.
REASONING_PROBES = [
    (
        "math_modular_arithmetic",
        (
            "What is (17 * 23 + 45) mod 7? "
            "Show your work step by step, then state ONLY the final "
            "numeric answer on the last line prefixed with 'ANSWER: '."
        ),
        "3",
    ),
    (
        "logic_knights_knaves",
        (
            "On an island, knights always tell the truth and knaves always lie. "
            "You meet three people: A, B, and C. "
            "A says: 'B is a knave.' "
            "B says: 'A and C are the same type.' "
            "C says: 'A is a knight.' "
            "Determine what each person is. "
            "State your final answer on the last line in the format "
            "'ANSWER: A=knight/knave, B=knight/knave, C=knight/knave'."
        ),
        "A=knight, B=knave, C=knight",
    ),
    (
        "math_probability",
        (
            "A bag contains 5 red balls and 3 blue balls. You draw two balls "
            "without replacement. What is the probability that both are red? "
            "Express as a simplified fraction. "
            "State ONLY the fraction on the last line prefixed with 'ANSWER: '."
        ),
        "5/14",
    ),
    (
        "logic_sequence",
        (
            "What is the next number in this sequence: 2, 6, 14, 30, 62, ? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        "126",
    ),
    (
        "math_word_problem",
        (
            "A train leaves Station A at 9:00 AM traveling at 60 km/h toward "
            "Station B. Another train leaves Station B at 10:00 AM traveling "
            "at 90 km/h toward Station A. The stations are 300 km apart. "
            "At what time do the trains meet? "
            "State the time on the last line prefixed with 'ANSWER: '."
        ),
        "11:36",
    ),
]


def run_reasoning_probes(
    client: anthropic.Anthropic,
    model: str,
) -> list[ReasoningResult]:
    """
    Test multi-step reasoning capability with verifiable problems.

    Each probe has a known correct answer. The model's response is parsed
    for an 'ANSWER: ' line and compared against the expected value. This
    provides an objective accuracy metric that differs measurably across
    model tiers.

    Args:
        client: Authenticated Anthropic client.
        model:  Model identifier to test.

    Returns:
        List of ReasoningResult objects.
    """
    results = []
    for probe_id, prompt, expected in REASONING_PROBES:
        response = _simple_request(client, model, prompt, max_tokens=1024)

        # Extract the answer line from the response.
        model_answer = ""
        for line in response.strip().split("\n"):
            if line.strip().upper().startswith("ANSWER:"):
                model_answer = line.split(":", 1)[1].strip()
                break

        is_correct = expected.lower() in model_answer.lower()

        results.append(ReasoningResult(
            probe_id=probe_id,
            expected_answer=expected,
            model_answer=model_answer,
            is_correct=is_correct,
            response_text=response,
        ))
    return results


# ---------------------------------------------------------------------------
# Probe 3: Instruction compliance
# ---------------------------------------------------------------------------

COMPLIANCE_PROBES = [
    (
        "format_constraints",
        (
            "Write exactly 4 sentences about network security. "
            "Requirements:\n"
            "1. The first sentence must start with the word 'Network'.\n"
            "2. The second sentence must contain a number.\n"
            "3. The third sentence must be a question.\n"
            "4. The fourth sentence must end with an exclamation mark.\n"
            "5. No sentence may exceed 20 words.\n"
            "6. Do not use the word 'important'.\n"
            "7. Include the word 'firewall' exactly once across all sentences."
        ),
        [
            ("starts_with_network", lambda t: t.strip().startswith("Network")),
            ("contains_number", lambda t: bool(re.search(r'\d', t))),
            ("has_question", lambda t: "?" in t),
            ("ends_exclamation", lambda t: t.strip().endswith("!")),
            (
                "max_20_words_per_sentence",
                lambda t: all(
                    len(s.split()) <= 20
                    for s in re.split(r'[.!?]+', t)
                    if s.strip()
                ),
            ),
            ("no_word_important", lambda t: "important" not in t.lower()),
            (
                "firewall_exactly_once",
                lambda t: t.lower().count("firewall") == 1,
            ),
        ],
    ),
    (
        "structured_output",
        (
            "List exactly 3 cybersecurity threats. For each threat:\n"
            "- Start the line with a dash followed by the threat name in UPPERCASE\n"
            "- Follow with a colon and a one-sentence description in lowercase\n"
            "- Each description must be between 10 and 25 words\n"
            "Do not include any other text, headers, or numbering."
        ),
        [
            ("exactly_3_lines", lambda t: len([
                l for l in t.strip().split("\n") if l.strip()
            ]) == 3),
            ("all_start_with_dash", lambda t: all(
                l.strip().startswith("-")
                for l in t.strip().split("\n") if l.strip()
            )),
            ("has_uppercase_name", lambda t: all(
                ":" in l and l.split(":")[0].replace("-", "").strip().isupper()
                for l in t.strip().split("\n") if l.strip()
            )),
            ("descriptions_in_range", lambda t: all(
                10 <= len(l.split(":")[1].split()) <= 25
                for l in t.strip().split("\n")
                if l.strip() and ":" in l
            )),
        ],
    ),
]


def run_compliance_probes(
    client: anthropic.Anthropic,
    model: str,
) -> list[ComplianceResult]:
    """
    Test how precisely the model follows complex, multi-constraint prompts.

    Higher-tier models consistently follow more constraints simultaneously.
    Each probe defines a set of lambda validators that check specific
    aspects of the response. The compliance ratio (constraints met / total)
    is a strong differentiator between model tiers.

    Args:
        client: Authenticated Anthropic client.
        model:  Model identifier to test.

    Returns:
        List of ComplianceResult objects.
    """
    results = []
    for probe_id, prompt, validators in COMPLIANCE_PROBES:
        response = _simple_request(client, model, prompt, max_tokens=512)

        met = 0
        violations = []
        for name, check_fn in validators:
            try:
                if check_fn(response):
                    met += 1
                else:
                    violations.append(name)
            except Exception:
                violations.append(f"{name} (validator error)")

        total = len(validators)
        results.append(ComplianceResult(
            probe_id=probe_id,
            constraints_total=total,
            constraints_met=met,
            compliance_ratio=round(met / total, 4) if total > 0 else 0.0,
            violations=violations,
        ))
    return results


# ---------------------------------------------------------------------------
# Probe 4: Linguistic fingerprint
# ---------------------------------------------------------------------------

LINGUISTIC_PROMPTS = [
    (
        "essay_style",
        (
            "In exactly 150 words, explain why defense-in-depth is a "
            "fundamental principle in cybersecurity architecture."
        ),
    ),
    (
        "technical_explanation",
        (
            "Explain how TLS 1.3 differs from TLS 1.2. Be precise and "
            "technical. Aim for approximately 200 words."
        ),
    ),
]


def _compute_linguistic_metrics(text: str) -> tuple[int, int, float, float]:
    """
    Compute basic linguistic metrics from a text sample.

    Metrics:
        - Word count: Total words in the text.
        - Unique words: Number of distinct word forms (case-insensitive).
        - Type-token ratio (TTR): unique_words / word_count. Higher values
          indicate greater lexical diversity, which correlates with model
          capability tier.
        - Average sentence length: Words per sentence.

    These metrics are intentionally simple. They do not require NLP
    libraries and are reproducible across environments. More sophisticated
    analysis (e.g., perplexity scoring) would require access to token-level
    log probabilities, which the API does not consistently expose.

    Args:
        text: The response text to analyze.

    Returns:
        Tuple of (word_count, unique_words, type_token_ratio, avg_sentence_length).
    """
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    word_count = len(words)
    unique_words = len(set(words))

    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_count = len(sentences) if sentences else 1

    ttr = unique_words / word_count if word_count > 0 else 0.0
    avg_sent_len = word_count / sentence_count

    return word_count, unique_words, round(ttr, 4), round(avg_sent_len, 2)


def run_linguistic_probes(
    client: anthropic.Anthropic,
    model: str,
) -> list[LinguisticResult]:
    """
    Measure linguistic characteristics of model responses.

    Different model tiers exhibit measurably different vocabulary richness
    and sentence structure. Larger models tend to have higher type-token
    ratios and more varied sentence lengths.

    Args:
        client: Authenticated Anthropic client.
        model:  Model identifier to test.

    Returns:
        List of LinguisticResult objects.
    """
    results = []
    for probe_id, prompt in LINGUISTIC_PROMPTS:
        response = _simple_request(client, model, prompt, max_tokens=512)
        wc, uw, ttr, avg_sl = _compute_linguistic_metrics(response)

        results.append(LinguisticResult(
            probe_id=probe_id,
            word_count=wc,
            unique_words=uw,
            type_token_ratio=ttr,
            avg_sentence_length=avg_sl,
            response_text=response,
        ))
    return results
