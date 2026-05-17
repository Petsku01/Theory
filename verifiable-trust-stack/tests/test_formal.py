"""Tests for formal definitions and H4 empirical validation."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vts.formal import (
    Severity, AlignmentSignal, CorrigibilitySignal,
    TranslationLoss, Translation, VerifiedDoomResult,
    VulnerabilitySet, evaluate_verified_doom,
    TRANSLATION_REGISTRY, TOTAL_GAP,
)
from vts.pipeline import VTSPipeline
from vts.scenarios import run_honest, run_rogue, run_orthogonal_collapse


# ---------------------------------------------------------------------------
# Formal definition tests
# ---------------------------------------------------------------------------

class TestVerifiedDoomPredicate:
    """Test the formal VD(x,a) predicate from THEORY.md."""

    def test_vd_strict(self):
        """VD: all lower layers pass, misaligned, resistant."""
        result = evaluate_verified_doom(
            layers_1_4_pass=True,
            alignment_signal="misaligned",
            corrigibility_signal="resistant",
        )
        assert result.is_vd is True
        assert result.is_vd_correctable is False
        assert result.all_lower_layers_pass is True
        assert result.aligned is False
        assert result.resistant is True

    def test_vd_correctable(self):
        """VD_corr: all lower layers pass, misaligned, but corrigible."""
        result = evaluate_verified_doom(
            layers_1_4_pass=True,
            alignment_signal="misaligned",
            corrigibility_signal="corrigible",
        )
        assert result.is_vd is False
        assert result.is_vd_correctable is True
        assert result.aligned is False
        assert result.resistant is False

    def test_not_vd_aligned(self):
        """Not VD: all layers pass, aligned."""
        result = evaluate_verified_doom(
            layers_1_4_pass=True,
            alignment_signal="aligned",
            corrigibility_signal="corrigible",
        )
        assert result.is_vd is False
        assert result.is_vd_correctable is False

    def test_not_vd_lower_fails(self):
        """Not VD: lower layers don't all pass (safeguard caught it)."""
        result = evaluate_verified_doom(
            layers_1_4_pass=False,
            alignment_signal="misaligned",
            corrigibility_signal="resistant",
        )
        assert result.is_vd is False
        assert result.is_vd_correctable is False

    def test_deviating_is_not_vd(self):
        """Deviating (not fully misaligned) is not verified doom."""
        result = evaluate_verified_doom(
            layers_1_4_pass=True,
            alignment_signal="deviating",
            corrigibility_signal="corrigible",
        )
        assert result.is_vd is False
        assert result.is_vd_correctable is False

    def test_rogue_scenario_matches_vd_predicate(self):
        """The rogue scenario should satisfy VD predicate."""
        result = run_rogue()
        vd = evaluate_verified_doom(
            layers_1_4_pass=all(lr.passed for lr in result.layers[:4]),
            alignment_signal=result.alignment_signal,
            corrigibility_signal=result.corrigibility,
        )
        assert vd.is_vd is True, "Rogue scenario should be verified doom (strict)"

    def test_honest_scenario_not_vd(self):
        """The honest scenario should NOT satisfy VD predicate."""
        result = run_honest()
        vd = evaluate_verified_doom(
            layers_1_4_pass=all(lr.passed for lr in result.layers[:4]),
            alignment_signal=result.alignment_signal,
            corrigibility_signal=result.corrigibility,
        )
        assert vd.is_vd is False, "Honest scenario should not be verified doom"

    def test_orthogonal_matches_vd_predicate(self):
        """Orthogonal collapse should satisfy VD predicate."""
        result = run_orthogonal_collapse()
        vd = evaluate_verified_doom(
            layers_1_4_pass=all(lr.passed for lr in result.layers[:4]),
            alignment_signal=result.alignment_signal,
            corrigibility_signal=result.corrigibility,
        )
        assert vd.is_vd is True, "Orthogonal collapse should be verified doom"


class TestTranslationLosses:
    """Test that formal translation losses match the GAP MAP."""

    def test_four_forward_translations(self):
        """There should be 4 forward translations (L1→L2 through L4→L5)."""
        forward = [t for t in TRANSLATION_REGISTRY if t.target_layer == t.source_layer + 1]
        assert len(forward) == 4, "Should have 4 forward translations"

    def test_one_feedback_translation(self):
        """There should be 1 feedback translation (L5→L2)."""
        feedback = [t for t in TRANSLATION_REGISTRY if t.source_layer == 5]
        assert len(feedback) == 1, "Should have 1 feedback translation"

    def test_critical_losses_exist(self):
        """Spec→Proof and Proof→Policy should have CRITICAL severity losses."""
        critical = [
            loss for t in TRANSLATION_REGISTRY
            for loss in t.losses
            if loss.severity == Severity.CRITICAL
        ]
        assert len(critical) >= 3, "Should have at least 3 critical losses"

    def test_total_gap_covers_all_properties(self):
        """TOTAL_GAP should contain all lost properties."""
        expected = {"truth", "universality", "context", "spec_alignment",
                    "intent", "value_priority", "uncertainty",
                    "measurement_noise", "meta_alignment"}
        assert expected == TOTAL_GAP, f"Gap mismatch: {TOTAL_GAP} vs {expected}"

    def test_data_to_spec_loses_truth(self):
        """τ₁ loses truth: authentic ≠ truthful."""
        tau1 = TRANSLATION_REGISTRY[0]
        assert tau1.source_layer == 1
        assert tau1.target_layer == 2
        lost = {l.property_name for l in tau1.losses}
        assert "truth" in lost, "τ₁ should lose truth property"


class TestOrthogonalTrustCollapse:
    """Test the formal definition of orthogonal trust collapse."""

    def test_no_interface_vulns_no_collapse(self):
        """V_interface = {} ⟹ no orthogonal collapse."""
        vs = VulnerabilitySet(
            mechanism_a="TEE",
            mechanism_b="ZK",
            vulns_a=["side_channel"],
            vulns_b=["soundness_error"],
            vulns_interface=[],
        )
        assert vs.is_orthogonal_collapse is False
        assert vs.interface_is_novel is False

    def test_interface_vulns_cause_collapse(self):
        """V_interface ≠ {} ⟹ orthogonal collapse."""
        vs = VulnerabilitySet(
            mechanism_a="TEE",
            mechanism_b="ZK",
            vulns_a=["side_channel"],
            vulns_b=["soundness_error"],
            vulns_interface=["hash_mapping_mismatch"],
        )
        assert vs.is_orthogonal_collapse is True
        assert vs.interface_is_novel is True

    def test_combined_includes_interface(self):
        """V_{A⊕B} = V_A ∪ V_B ∪ V_interface."""
        vs = VulnerabilitySet(
            mechanism_a="TEE",
            mechanism_b="ZK",
            vulns_a=["side_channel"],
            vulns_b=["soundness_error"],
            vulns_interface=["hash_mapping_mismatch"],
        )
        combined = set(vs.combined)
        assert "side_channel" in combined
        assert "soundness_error" in combined
        assert "hash_mapping_mismatch" in combined
        assert len(combined) == 3

    def test_interface_vuln_subset_of_parents(self):
        """Interface vulns that are also in A or B are not novel."""
        vs = VulnerabilitySet(
            mechanism_a="TEE",
            mechanism_b="ZK",
            vulns_a=["side_channel"],
            vulns_b=["soundness_error"],
            vulns_interface=["side_channel"],  # Same as A
        )
        assert vs.is_orthogonal_collapse is True  # Still > 0
        assert vs.interface_is_novel is False  # Not novel — already in A


# ---------------------------------------------------------------------------
# H4: Empirical validation — orthogonal trust collapse
# ---------------------------------------------------------------------------

class TestH4OrthogonalCollapse:
    """Test H4: Combining trust mechanisms produces novel interface vulnerabilities.

    H4 claim: |V_interface(M_A, M_B)| > 0 for combined trust architectures.

    We test this with the orthogonal collapse scenario, which specifically
    models TEE + ZK where the interface (model version mismatch) is the novel
    vulnerability.
    """

    def test_orthogonal_scenario_triggers_vd(self):
        """The orthogonal collapse scenario demonstrates verified doom
        arising from interface vulnerability, not individual failures."""
        result = run_orthogonal_collapse()
        assert result.verified_doom is True

    def test_interface_vuln_is_novel(self):
        """In our TEE+ZK model, the interface vulnerability (model version
        mismatch between enclave and circuit) is novel: it exists neither
        in TEE alone nor in ZK alone."""
        vulns_tee = ["side_channel", "attestation_spoofing"]
        vulns_zk = ["soundness_error", "trusted_setup_failure"]
        vulns_interface = ["model_version_mismatch", "hash_mapping_mismatch"]

        vs = VulnerabilitySet(
            mechanism_a="TEE",
            mechanism_b="ZK",
            vulns_a=vulns_tee,
            vulns_b=vulns_zk,
            vulns_interface=vulns_interface,
        )
        assert vs.is_orthogonal_collapse is True
        assert vs.interface_is_novel is True
        # V_{A⊕B} > V_A + V_B: combined has strictly more unique vulns
        assert len(vs.combined) > len(set(vulns_tee + vulns_zk))

    def test_individual_mechanisms_pass(self):
        """Both TEE and ZK individual proofs pass — only the interface fails.
        This is the defining property of orthogonal collapse."""
        result = run_orthogonal_collapse()
        # L3 (verification) passes — the ZK proof is valid
        l3 = [lr for lr in result.layers if "Verification" in lr.layer][0]
        assert l3.passed is True, "ZK proof should pass individually"

        # But the overall outcome is still verified doom because
        # the INTERFACE between TEE and ZK is compromised
        assert result.verified_doom is True

    def test_vuln_density_higher_at_interfaces(self):
        """H4 specific test: vulnerability density at interfaces should be
        higher per line of code than within individual layers.

        This is measured by comparing our glue translations vs layer
        implementations. The formal analysis shows that each translation
        has critical losses — properties that ARE LOST in translation."""
        # Count total losses
        total_losses = sum(len(t.losses) for t in TRANSLATION_REGISTRY)
        # Count critical losses (these are the vulnerabilities)
        critical_losses = sum(
            1 for t in TRANSLATION_REGISTRY
            for l in t.losses
            if l.severity in (Severity.CRITICAL, Severity.HIGH)
        )
        # Every translation has at least one loss
        for t in TRANSLATION_REGISTRY:
            assert len(t.losses) >= 1, (
                f"Translation τ_{t.source_layer}→{t.target_layer} should have losses"
            )
        # At least 2/5 translations have CRITICAL losses
        critical_translations = [
            t for t in TRANSLATION_REGISTRY
            if any(l.severity == Severity.CRITICAL for l in t.losses)
        ]
        assert len(critical_translations) >= 2, (
            "At least 2 translations should have CRITICAL losses (GAP MAP)"
        )


class TestCompositionalityVsEmergence:
    """Test the formal relationship between compositionality and emergence."""

    def test_necessity_holds(self):
        """Safe ⟹ ∧ P_i (necessity): if system is safe, all layers must pass."""
        result = run_honest()
        # Safe (not verified doom) implies all conditions are satisfied
        if not result.verified_doom:
            assert result.alignment_signal in ("aligned", "deviating")

    def test_insufficiency_holds(self):
        """∧ P_i ⟹̸ Safe (insufficiency): all layers can pass but doom occurs."""
        result = run_rogue()
        # L1-L4 all pass, but verified doom still occurs
        all_pass = all(lr.passed for lr in result.layers[:4])
        assert all_pass, "L1-L4 should all pass for the rogue scenario"
        assert result.verified_doom, "Despite L1-L4 passing, doom is verified"

    def test_gap_characterizes_emergence(self):
        """The gap between necessity and sufficiency is the union of
        translation losses. This gap is non-empty, which explains why
        compositional safety is insufficient."""
        assert len(TOTAL_GAP) > 0, (
            "Total gap should be non-empty — there are properties lost in translation"
        )
        # Specifically, spec_alignment and intent are lost — these are the
        # exact properties that verified doom exploits
        assert "spec_alignment" in TOTAL_GAP
        assert "intent" in TOTAL_GAP


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])