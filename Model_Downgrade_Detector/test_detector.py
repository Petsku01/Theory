"""
test_detector.py -- Unit tests for the Claude Model Downgrade Detector.

Tests cover:
    - Reasoning answer verification logic
    - Compliance validator correctness
    - Scoring math (_score_in_range)
    - Weight redistribution for skipped probes
    - Linguistic metric computation
    - Sentence splitting

Run with: python -m pytest test_detector.py -v
Or:       python test_detector.py

Author: Petteri Kosonen
License: MIT
"""

import math
import unittest

from probes import (
    _split_sentences,
    _compute_linguistic_metrics,
    REASONING_PROBES,
    COMPLIANCE_PROBES,
)
from analyzer import (
    _score_in_range,
    _compute_active_weights,
    score_reasoning,
    score_latency,
    DEFAULT_CATEGORY_WEIGHTS,
)


# ---------------------------------------------------------------------------
# Reasoning answer verification
# ---------------------------------------------------------------------------

class TestReasoningAnswers(unittest.TestCase):
    """
    Verify that every expected answer in REASONING_PROBES is correct.

    This is the most critical test. If these fail, the entire detection
    tool produces wrong results.
    """

    def test_math_modular_arithmetic(self):
        # (17 * 23 + 45) mod 7 = (391 + 45) mod 7 = 436 mod 7
        result = (17 * 23 + 45) % 7
        self.assertEqual(result, 2)
        self._assert_probe_answer("math_modular_arithmetic", "2")

    def test_logic_knights_knaves(self):
        # Verified by exhaustive case analysis in the probe comment.
        self._assert_probe_answer(
            "logic_knights_knaves",
            "a=knave, b=knight, c=knave",
        )

    def test_math_probability(self):
        # P(both red) = (5/8) * (4/7) = 20/56 = 5/14
        from fractions import Fraction
        p = Fraction(5, 8) * Fraction(4, 7)
        self.assertEqual(p, Fraction(5, 14))
        self._assert_probe_answer("math_probability", "5/14")

    def test_logic_sequence(self):
        # 2, 6, 14, 30, 62, ? -> differences: 4, 8, 16, 32, 64 -> next = 126
        seq = [2, 6, 14, 30, 62]
        diffs = [seq[i+1] - seq[i] for i in range(len(seq)-1)]
        self.assertEqual(diffs, [4, 8, 16, 32])
        next_val = seq[-1] + 64
        self.assertEqual(next_val, 126)
        self._assert_probe_answer("logic_sequence", "126")

    def test_math_word_problem(self):
        # Train A: 60 km/h from 9:00. Train B: 90 km/h from 10:00. 300 km apart.
        # At 10:00, A has traveled 60 km. Gap = 240 km. Combined = 150 km/h.
        # Time = 240/150 = 1.6 hours = 1h 36m. Meet at 11:36.
        gap_at_10 = 300 - 60
        combined_speed = 60 + 90
        hours = gap_at_10 / combined_speed
        minutes = hours * 60
        self.assertAlmostEqual(minutes, 96.0)  # 1h36m = 96 minutes after 10:00
        self._assert_probe_answer("math_word_problem", "11:36")

    def test_math_combinatorics(self):
        # C(8,3) = 56
        from math import comb
        self.assertEqual(comb(8, 3), 56)
        self._assert_probe_answer("math_combinatorics", "56")

    def test_logic_deduction(self):
        # Carol can't have cat or dog -> Carol=fish.
        # Bob can't have fish -> Bob=dog. Alice=cat.
        self._assert_probe_answer(
            "logic_deduction",
            "alice=cat, bob=dog, carol=fish",
        )

    def test_math_geometry(self):
        # sqrt(7^2 + 24^2) = sqrt(49 + 576) = sqrt(625) = 25
        hyp = math.sqrt(7**2 + 24**2)
        self.assertEqual(hyp, 25.0)
        self._assert_probe_answer("math_geometry", "25")

    def test_math_series_sum(self):
        # 1+2+...+50 = 50*51/2 = 1275
        self.assertEqual(sum(range(1, 51)), 1275)
        self._assert_probe_answer("math_series_sum", "1275")

    def test_logic_truth_table(self):
        # NOT (True AND False) OR True = NOT False OR True = True OR True = True
        a, b, c = True, False, True
        result = (not (a and b)) or c
        self.assertTrue(result)
        self._assert_probe_answer("logic_truth_table", "true")

    def test_math_gcd(self):
        # GCD(48, 180) = 12
        self.assertEqual(math.gcd(48, 180), 12)
        self._assert_probe_answer("math_gcd", "12")

    def test_math_base_conversion(self):
        # 255 in hex = ff
        self.assertEqual(hex(255), "0xff")
        self._assert_probe_answer("math_base_conversion", "ff")

    def test_logic_syllogism(self):
        # All roses are flowers, all flowers are plants -> all roses are plants.
        # "Some roses are not plants" contradicts -> Invalid.
        self._assert_probe_answer("logic_syllogism", "invalid")

    def test_math_percentage(self):
        # 15% of 240 = 36. 240 - 36 = 204.
        self.assertEqual(240 - int(240 * 0.15), 204)
        self._assert_probe_answer("math_percentage", "204")

    def test_math_lcm(self):
        # LCM(12, 18) = 36
        self.assertEqual(math.lcm(12, 18), 36)
        self._assert_probe_answer("math_lcm", "36")

    def _assert_probe_answer(self, probe_id: str, expected: str):
        """Verify that a probe's expected answer list contains the given value."""
        for pid, _, answers in REASONING_PROBES:
            if pid == probe_id:
                self.assertIn(
                    expected,
                    [a.lower().strip() for a in answers],
                    f"Probe {probe_id}: expected '{expected}' not in {answers}",
                )
                return
        self.fail(f"Probe {probe_id} not found in REASONING_PROBES")


# ---------------------------------------------------------------------------
# Sentence splitting
# ---------------------------------------------------------------------------

class TestSentenceSplitting(unittest.TestCase):
    """Test the sentence splitter used by compliance validators."""

    def test_basic_sentences(self):
        text = "First sentence. Second sentence. Third sentence."
        result = _split_sentences(text)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0], "First sentence.")
        self.assertEqual(result[1], "Second sentence.")
        self.assertEqual(result[2], "Third sentence.")

    def test_mixed_punctuation(self):
        text = "A statement. A question? An exclamation!"
        result = _split_sentences(text)
        self.assertEqual(len(result), 3)
        self.assertTrue(result[1].endswith("?"))
        self.assertTrue(result[2].endswith("!"))

    def test_empty_string(self):
        result = _split_sentences("")
        self.assertEqual(result, [])

    def test_single_sentence(self):
        result = _split_sentences("Just one sentence.")
        self.assertEqual(len(result), 1)

    def test_extra_whitespace(self):
        text = "First.   Second.   Third."
        result = _split_sentences(text)
        self.assertEqual(len(result), 3)


# ---------------------------------------------------------------------------
# Compliance validators
# ---------------------------------------------------------------------------

class TestComplianceValidators(unittest.TestCase):
    """
    Test compliance validators against known-good and known-bad responses.
    """

    def _get_validators(self, probe_id: str) -> list:
        """Get the validator list for a specific compliance probe."""
        for pid, _, validators in COMPLIANCE_PROBES:
            if pid == probe_id:
                return validators
        self.fail(f"Probe {probe_id} not found")

    def test_format_constraints_perfect_response(self):
        # A response that should pass all 8 constraints.
        text = (
            "Network security protects digital assets. "
            "Over 3 billion records were breached last year. "
            "Is your firewall configured correctly? "
            "Stay vigilant against threats!"
        )
        validators = self._get_validators("format_constraints")
        for name, check_fn in validators:
            self.assertTrue(
                check_fn(text),
                f"Validator '{name}' should pass on perfect response",
            )

    def test_format_first_sentence_wrong_start(self):
        text = (
            "Security is essential. "
            "Over 3 billion records leaked. "
            "Is your firewall ready? "
            "Act now!"
        )
        validators = self._get_validators("format_constraints")
        first_sent_validator = validators[0]  # first_sentence_starts_with_network
        self.assertFalse(first_sent_validator[1](text))

    def test_format_important_word_detected(self):
        text = (
            "Network defense is important. "
            "There are 5 key areas. "
            "Is your firewall ready? "
            "Protect yourself!"
        )
        validators = self._get_validators("format_constraints")
        # Find the no_word_important validator.
        for name, check_fn in validators:
            if name == "no_word_important":
                self.assertFalse(check_fn(text))

    def test_format_second_sentence_no_number(self):
        text = (
            "Network security matters. "
            "Threats are everywhere. "
            "Is your firewall ready? "
            "Act now!"
        )
        validators = self._get_validators("format_constraints")
        second_sent_validator = validators[1]  # second_sentence_contains_number
        self.assertFalse(second_sent_validator[1](text))


# ---------------------------------------------------------------------------
# Scoring math
# ---------------------------------------------------------------------------

class TestScoreInRange(unittest.TestCase):
    """Test the _score_in_range function used for all tier comparisons."""

    def test_value_at_typical_scores_highest(self):
        score = _score_in_range(100.0, 50.0, 150.0, 100.0)
        # At typical: range_score=1.0, typical_score=1.0 -> avg=1.0
        self.assertEqual(score, 1.0)

    def test_value_in_range_but_not_typical(self):
        score = _score_in_range(50.0, 50.0, 150.0, 100.0)
        # In range: range_score=1.0. Distance from typical=50, sigma=50.
        # typical_score = exp(-50^2/(2*50^2)) = exp(-0.5) ~ 0.6065
        # avg ~ (1.0 + 0.6065) / 2 ~ 0.8033
        self.assertGreater(score, 0.75)
        self.assertLess(score, 0.85)

    def test_value_outside_range_scores_lower(self):
        inside = _score_in_range(100.0, 50.0, 150.0, 100.0)
        outside = _score_in_range(200.0, 50.0, 150.0, 100.0)
        self.assertGreater(inside, outside)

    def test_value_far_outside_range_approaches_zero(self):
        score = _score_in_range(10000.0, 50.0, 150.0, 100.0)
        self.assertLess(score, 0.05)

    def test_symmetry(self):
        # Equal distance below and above typical should score the same.
        below = _score_in_range(80.0, 50.0, 150.0, 100.0)
        above = _score_in_range(120.0, 50.0, 150.0, 100.0)
        self.assertAlmostEqual(below, above, places=3)

    def test_overlapping_ranges_differentiated_by_typical(self):
        # Value=1000 falls in both Opus (800-3000, typical=1500) and
        # Sonnet (400-1800, typical=900) TTFT ranges. The tier with
        # closer typical should score higher.
        opus_score = _score_in_range(1000.0, 800.0, 3000.0, 1500.0)
        sonnet_score = _score_in_range(1000.0, 400.0, 1800.0, 900.0)
        # 1000 is closer to Sonnet typical (900) than Opus typical (1500).
        self.assertGreater(sonnet_score, opus_score)


# ---------------------------------------------------------------------------
# Weight redistribution
# ---------------------------------------------------------------------------

class TestWeightRedistribution(unittest.TestCase):
    """Test that skipped probes don't distort scoring."""

    def test_all_probes_active(self):
        results = {
            "latency": [{"ttft_ms": 100}],
            "reasoning": [{"is_correct": True}],
            "compliance": [{"compliance_ratio": 0.9}],
            "linguistic": [{"type_token_ratio": 0.6}],
        }
        weights = _compute_active_weights(results)
        total = sum(weights.values())
        self.assertAlmostEqual(total, 1.0, places=2)
        self.assertEqual(len(weights), 4)

    def test_one_probe_skipped(self):
        results = {
            "latency": [],  # Skipped
            "reasoning": [{"is_correct": True}],
            "compliance": [{"compliance_ratio": 0.9}],
            "linguistic": [{"type_token_ratio": 0.6}],
        }
        weights = _compute_active_weights(results)
        total = sum(weights.values())
        self.assertAlmostEqual(total, 1.0, places=2)
        self.assertNotIn("latency", weights)
        self.assertEqual(len(weights), 3)

    def test_all_probes_skipped_returns_defaults(self):
        results = {
            "latency": [],
            "reasoning": [],
            "compliance": [],
            "linguistic": [],
        }
        weights = _compute_active_weights(results)
        self.assertEqual(len(weights), 4)

    def test_redistributed_weights_are_proportional(self):
        results = {
            "latency": [],  # Skipped (weight 0.20)
            "reasoning": [{"is_correct": True}],   # weight 0.35
            "compliance": [{"compliance_ratio": 0.9}],  # weight 0.25
            "linguistic": [{"type_token_ratio": 0.6}],  # weight 0.20
        }
        weights = _compute_active_weights(results)
        # Remaining weights: 0.35 + 0.25 + 0.20 = 0.80
        # Reasoning should get 0.35/0.80 = 0.4375
        self.assertAlmostEqual(weights["reasoning"], 0.4375, places=3)


# ---------------------------------------------------------------------------
# Linguistic metrics
# ---------------------------------------------------------------------------

class TestLinguisticMetrics(unittest.TestCase):
    """Test the linguistic analysis computation."""

    def test_basic_metrics(self):
        text = "The cat sat on the mat. The dog ran fast."
        wc, uw, ttr, avg_sl = _compute_linguistic_metrics(text)
        self.assertEqual(wc, 10)
        # Unique: the, cat, sat, on, mat, dog, ran, fast = 8
        self.assertEqual(uw, 8)
        self.assertAlmostEqual(ttr, 0.8, places=3)
        # 2 sentences, 10 words -> avg 5.0
        self.assertAlmostEqual(avg_sl, 5.0, places=1)

    def test_empty_text(self):
        wc, uw, ttr, avg_sl = _compute_linguistic_metrics("")
        self.assertEqual(wc, 0)
        self.assertEqual(uw, 0)
        self.assertEqual(ttr, 0.0)

    def test_single_word(self):
        wc, uw, ttr, avg_sl = _compute_linguistic_metrics("Hello")
        self.assertEqual(wc, 1)
        self.assertEqual(uw, 1)
        self.assertEqual(ttr, 1.0)

    def test_repeated_words_lower_ttr(self):
        text_diverse = "Alpha beta gamma delta epsilon zeta eta theta."
        text_repeated = "The the the the the the the the."
        _, _, ttr_diverse, _ = _compute_linguistic_metrics(text_diverse)
        _, _, ttr_repeated, _ = _compute_linguistic_metrics(text_repeated)
        self.assertGreater(ttr_diverse, ttr_repeated)


# ---------------------------------------------------------------------------
# Score functions with mock data
# ---------------------------------------------------------------------------

class TestScoreLatency(unittest.TestCase):
    """Test latency scoring with synthetic data."""

    def test_empty_results(self):
        score = score_latency([], {"ttft_ms": {}, "words_per_second": {}})
        self.assertEqual(score, 0.0)

    def test_perfect_match(self):
        results = [
            {"ttft_ms": 1500.0, "words_per_second": 22.0},
            {"ttft_ms": 1500.0, "words_per_second": 22.0},
        ]
        baseline = {
            "ttft_ms": {"min": 800, "max": 3000, "typical": 1500},
            "words_per_second": {"min": 10, "max": 40, "typical": 22},
        }
        score = score_latency(results, baseline)
        self.assertEqual(score, 1.0)


class TestScoreReasoning(unittest.TestCase):
    """Test reasoning scoring with synthetic data."""

    def test_empty_results(self):
        score = score_reasoning([], {"reasoning_accuracy": {}})
        self.assertEqual(score, 0.0)

    def test_all_correct_matches_opus(self):
        results = [{"is_correct": True}] * 15
        baseline = {
            "reasoning_accuracy": {"min": 0.80, "max": 1.00, "typical": 0.93},
        }
        score = score_reasoning(results, baseline)
        # 100% accuracy, typical is 93%. Should score high.
        self.assertGreater(score, 0.85)

    def test_half_correct_matches_haiku(self):
        results = [{"is_correct": True}] * 7 + [{"is_correct": False}] * 8
        baseline = {
            "reasoning_accuracy": {"min": 0.25, "max": 0.60, "typical": 0.45},
        }
        score = score_reasoning(results, baseline)
        # 46.7% accuracy, typical is 45%. Should be a close match.
        self.assertGreater(score, 0.85)


if __name__ == "__main__":
    unittest.main()
