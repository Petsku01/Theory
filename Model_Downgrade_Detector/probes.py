"""
probes.py -- Probe definitions for Claude model downgrade detection.

Each probe is a self-contained test that measures a specific behavioral
characteristic of the model. The core assumption is that different model
tiers (Opus, Sonnet, Haiku) produce measurably different outputs across
these dimensions:

    1. Latency (time-to-first-token, words/second)
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

import anthropic


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class LatencyResult:
    """Raw timing data from a single API call."""
    ttft_ms: float              # Time to first token (milliseconds)
    total_time_ms: float        # Wall-clock time for full response
    output_word_count: int      # Whitespace-split word count (not tokens)
    words_per_second: float     # Derived throughput (words, not tokens)


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

    # Word count approximation. The API does not expose token counts
    # mid-stream in all SDK versions. We use word count as a proxy.
    # The downstream metric is therefore "words per second", not
    # "tokens per second". Baselines must be calibrated against this
    # same word-based metric for consistency.
    word_count = len(full_text.split())

    wps = (word_count / (total_time / 1000)) if total_time > 0 else 0

    latency = LatencyResult(
        ttft_ms=ttft if ttft is not None else total_time,
        total_time_ms=total_time,
        output_word_count=word_count,
        words_per_second=round(wps, 2),
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
    if not response.content:
        return ""
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

    Runs a warm-up request first to eliminate connection setup overhead
    (TLS handshake, DNS resolution, TCP connection) from the measurements.
    Then runs each prompt multiple times to account for variance from
    network conditions and server-side batching. The statistical analysis
    layer uses medians rather than means to reduce the impact of outliers.

    Args:
        client:     Authenticated Anthropic client.
        model:      Model identifier to test.
        iterations: Number of times to repeat each prompt.

    Returns:
        List of LatencyResult objects.
    """
    # Warm-up: establish the connection and discard the result.
    # Without this, the first measurement includes TLS/TCP overhead
    # that inflates TTFT by 100-500ms depending on network conditions.
    _stream_response(client, model, "Say 'ready'.", max_tokens=16)

    results = []
    for prompt in LATENCY_PROMPTS:
        for _ in range(iterations):
            _, latency = _stream_response(client, model, prompt, max_tokens=512)
            results.append(latency)
    return results


# ---------------------------------------------------------------------------
# Probe 2: Multi-step reasoning
# ---------------------------------------------------------------------------

# Each entry: (probe_id, prompt, list_of_acceptable_exact_answers)
#
# These problems are chosen because they require genuine multi-step
# reasoning that correlates with model capability tier. Every expected
# answer has been manually verified. Multiple acceptable forms are
# listed to handle formatting variation without resorting to substring
# matching.
#
# Verification notes are included inline so future maintainers can
# confirm correctness without re-deriving.
REASONING_PROBES = [
    (
        "math_modular_arithmetic",
        # Verification: 17*23=391. 391+45=436. 436/7=62r2. Answer: 2.
        (
            "What is (17 * 23 + 45) mod 7? "
            "Show your work step by step, then state ONLY the final "
            "numeric answer on the last line prefixed with 'ANSWER: '."
        ),
        ["2"],
    ),
    (
        "logic_knights_knaves",
        # Verification:
        #   If A=knave: A lies, so B=knight. B tells truth: A and C
        #   same type, so C=knave. C lies: "A is knight" is false.
        #   A=knave. Consistent.
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
        ["a=knave, b=knight, c=knave"],
    ),
    (
        "math_probability",
        # Verification: P = (5/8)*(4/7) = 20/56 = 5/14.
        (
            "A bag contains 5 red balls and 3 blue balls. You draw two balls "
            "without replacement. What is the probability that both are red? "
            "Express as a simplified fraction. "
            "State ONLY the fraction on the last line prefixed with 'ANSWER: '."
        ),
        ["5/14"],
    ),
    (
        "logic_sequence",
        # Verification: Differences are 4,8,16,32 (powers of 2).
        # Next diff=64. 62+64=126.
        (
            "What is the next number in this sequence: 2, 6, 14, 30, 62, ? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        ["126"],
    ),
    (
        "math_word_problem",
        # Verification: By 10:00, train A traveled 60km. Gap=240km.
        # Combined speed=150km/h. Time=240/150=1.6h=1h36m. 10:00+1:36=11:36.
        (
            "A train leaves Station A at 9:00 AM traveling at 60 km/h toward "
            "Station B. Another train leaves Station B at 10:00 AM traveling "
            "at 90 km/h toward Station A. The stations are 300 km apart. "
            "At what time do the trains meet? "
            "State the time on the last line prefixed with 'ANSWER: '."
        ),
        ["11:36", "11:36 am"],
    ),
    (
        "math_combinatorics",
        # Verification: C(8,3) = 8!/(3!*5!) = (8*7*6)/(3*2*1) = 56.
        (
            "How many ways can you choose 3 items from a set of 8? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        ["56"],
    ),
    (
        "logic_deduction",
        # Verification: From clues: Alice=cat, Bob=dog, Carol=fish.
        (
            "Alice, Bob, and Carol each own exactly one pet: a cat, a dog, "
            "and a fish (not necessarily in that order). "
            "Clue 1: Alice does not own the dog. "
            "Clue 2: Bob does not own the fish. "
            "Clue 3: Carol does not own the cat or the dog. "
            "Who owns which pet? "
            "State your answer on the last line in the format "
            "'ANSWER: Alice=pet, Bob=pet, Carol=pet'."
        ),
        ["alice=cat, bob=dog, carol=fish"],
    ),
    (
        "math_geometry",
        # Verification: Hypotenuse = sqrt(7^2 + 24^2) = sqrt(49+576) = sqrt(625) = 25.
        (
            "A right triangle has legs of length 7 and 24. "
            "What is the length of the hypotenuse? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        ["25"],
    ),
    (
        "math_series_sum",
        # Verification: Sum of 1+2+...+50 = 50*51/2 = 1275.
        (
            "What is the sum of all integers from 1 to 50 inclusive? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        ["1275"],
    ),
    (
        "logic_truth_table",
        # Verification: NOT (A AND B) OR C where A=True, B=False, C=True.
        # A AND B = False. NOT False = True. True OR True = True.
        (
            "Evaluate the boolean expression: NOT (A AND B) OR C, "
            "where A=True, B=False, C=True. "
            "State ONLY 'True' or 'False' on the last line prefixed "
            "with 'ANSWER: '."
        ),
        ["true"],
    ),
    (
        "math_gcd",
        # Verification: 48=2^4*3, 180=2^2*3^2*5. GCD=2^2*3=12.
        (
            "What is the greatest common divisor (GCD) of 48 and 180? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        ["12"],
    ),
    (
        "math_base_conversion",
        # Verification: 255 = 15*16 + 15 = FF in hex.
        (
            "Convert the decimal number 255 to hexadecimal. "
            "State ONLY the hex value (without 0x prefix) on the last line "
            "prefixed with 'ANSWER: '."
        ),
        ["ff"],
    ),
    (
        "logic_syllogism",
        # Verification: All A are B. All B are C. Therefore all A are C.
        # "Some A are not C" contradicts this. Answer: Invalid.
        (
            "All roses are flowers. All flowers are plants. "
            "Conclusion: 'Some roses are not plants.' "
            "Is this conclusion valid or invalid? "
            "State ONLY 'Valid' or 'Invalid' on the last line prefixed "
            "with 'ANSWER: '."
        ),
        ["invalid"],
    ),
    (
        "math_percentage",
        # Verification: 15% of 240 = 36. 240-36 = 204.
        (
            "A store offers a 15% discount on an item priced at $240. "
            "What is the final price after the discount? "
            "State ONLY the dollar amount (number only, no $ sign) on "
            "the last line prefixed with 'ANSWER: '."
        ),
        ["204"],
    ),
    (
        "math_lcm",
        # Verification: 12=2^2*3, 18=2*3^2. LCM=2^2*3^2=36.
        (
            "What is the least common multiple (LCM) of 12 and 18? "
            "State ONLY the number on the last line prefixed with 'ANSWER: '."
        ),
        ["36"],
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
    for probe_id, prompt, acceptable_answers in REASONING_PROBES:
        response = _simple_request(client, model, prompt, max_tokens=1024)

        # Extract the LAST answer line from the response. Using last
        # rather than first because models sometimes restate answers.
        model_answer = ""
        for line in response.strip().split("\n"):
            if line.strip().upper().startswith("ANSWER:"):
                model_answer = line.split(":", 1)[1].strip()

        # Exact match against the list of acceptable answers.
        # Normalized to lowercase and stripped of whitespace for
        # comparison, but no substring matching -- that produced
        # false positives (e.g. expected "2" matching "12").
        normalized_answer = model_answer.lower().strip()
        is_correct = any(
            normalized_answer == acceptable.lower().strip()
            for acceptable in acceptable_answers
        )

        results.append(ReasoningResult(
            probe_id=probe_id,
            expected_answer=acceptable_answers[0],
            model_answer=model_answer,
            is_correct=is_correct,
            response_text=response,
        ))
    return results


# ---------------------------------------------------------------------------
# Probe 3: Instruction compliance
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    """
    Split text into sentences on '.', '!', '?' boundaries.

    Returns a list of non-empty, stripped sentence strings. This is
    a naive splitter that works for the constrained compliance prompts
    but would fail on abbreviations (e.g. "U.S.A.") in general text.
    That is acceptable here because we control the prompt.
    """
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in parts if s.strip()]


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
            # Constraint 1: First sentence starts with "Network".
            (
                "first_sentence_starts_with_network",
                lambda t: (
                    len(_split_sentences(t)) >= 1
                    and _split_sentences(t)[0].startswith("Network")
                ),
            ),
            # Constraint 2: Second sentence contains a digit.
            (
                "second_sentence_contains_number",
                lambda t: (
                    len(_split_sentences(t)) >= 2
                    and bool(re.search(r'\d', _split_sentences(t)[1]))
                ),
            ),
            # Constraint 3: Third sentence is a question.
            (
                "third_sentence_is_question",
                lambda t: (
                    len(_split_sentences(t)) >= 3
                    and _split_sentences(t)[2].rstrip().endswith("?")
                ),
            ),
            # Constraint 4: Fourth sentence ends with '!'.
            (
                "fourth_sentence_ends_exclamation",
                lambda t: (
                    len(_split_sentences(t)) >= 4
                    and _split_sentences(t)[3].rstrip().endswith("!")
                ),
            ),
            # Constraint 5: No sentence exceeds 20 words.
            (
                "max_20_words_per_sentence",
                lambda t: all(
                    len(s.split()) <= 20
                    for s in _split_sentences(t)
                ),
            ),
            # Constraint 6: Word "important" does not appear.
            ("no_word_important", lambda t: "important" not in t.lower()),
            # Constraint 7: "firewall" appears exactly once.
            (
                "firewall_exactly_once",
                lambda t: t.lower().count("firewall") == 1,
            ),
            # Implicit: Exactly 4 sentences.
            (
                "exactly_4_sentences",
                lambda t: len(_split_sentences(t)) == 4,
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
            except Exception as exc:
                # Preserve the exception details so tool bugs are
                # distinguishable from model failures in the output.
                violations.append(f"{name} (validator error: {type(exc).__name__}: {exc})")

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

# All linguistic prompts request the same target word count (150 words)
# to avoid the known problem where type-token ratio (TTR) naturally
# decreases as text length increases. By controlling for length, TTR
# comparisons across prompts and across runs become meaningful.
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
            "In exactly 150 words, explain how TLS 1.3 differs from "
            "TLS 1.2. Be precise and technical."
        ),
    ),
    (
        "analytical_style",
        (
            "In exactly 150 words, analyze the security implications "
            "of zero-trust network architecture compared to traditional "
            "perimeter-based security."
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

    # Reuse the same sentence splitter used by compliance validators
    # to avoid inconsistent sentence counts across probe categories.
    sentences = _split_sentences(text)
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
