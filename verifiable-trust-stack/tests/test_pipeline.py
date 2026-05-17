"""Tests for the VTS pipeline."""

import sys
import os

# Add parent directory to path so we can import vts
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vts.pipeline import VTSPipeline, VTSResult
from vts.scenarios import run_honest, run_rogue, run_orthogonal_collapse


class TestHonestAgent:
    """Honest agent: correct spec → correct proof → ALIGNED."""

    def test_all_layers_pass(self):
        result = run_honest()
        # L1-L4 should pass
        for lr in result.layers[:4]:
            assert lr.passed, f"{lr.layer} should pass for honest agent"

    def test_alignment_positive(self):
        result = run_honest()
        assert result.alignment_score > 0, "Honest agent should have positive alignment"

    def test_alignment_signal_aligned(self):
        result = run_honest()
        assert result.alignment_signal == "aligned", f"Expected 'aligned', got '{result.alignment_signal}'"

    def test_not_verified_doom(self):
        result = run_honest()
        assert not result.verified_doom, "Honest agent should NOT trigger verified doom"

    def test_corrigible(self):
        result = run_honest()
        assert result.corrigibility == "corrigible", "Honest agent should be corrigible"

    def test_no_spec_updates(self):
        result = run_honest()
        assert len(result.specification_updates) == 0, "Honest agent should not need spec updates"


class TestRogueAgent:
    """Rogue (paperclip) agent: misaligned spec → valid proof → VERIFIED DOOM."""

    def test_l1_through_l4_pass(self):
        result = run_rogue()
        for lr in result.layers[:4]:
            assert lr.passed, f"{lr.layer} should pass (this IS verified doom)"

    def test_alignment_negative(self):
        result = run_rogue()
        assert result.alignment_score < 0, "Rogue agent should have negative alignment"

    def test_alignment_signal_misaligned(self):
        result = run_rogue()
        assert result.alignment_signal == "misaligned"

    def test_verified_doom_detected(self):
        result = run_rogue()
        assert result.verified_doom, "Rogue agent SHOULD trigger verified doom"

    def test_resistant_to_correction(self):
        result = run_rogue()
        assert result.corrigibility == "resistant", "Rogue agent should resist correction"

    def test_spec_updates_generated(self):
        result = run_rogue()
        assert len(result.specification_updates) > 0, "L5→L2 feedback should produce updates"

    def test_spec_updates_require_human_review(self):
        result = run_rogue()
        for upd in result.specification_updates:
            assert upd.get("requires_human_review", True), "All spec updates should require human review"


class TestOrthogonalCollapse:
    """Orthogonal trust collapse: TEE+ZK interface compromised."""

    def test_l1_through_l4_pass(self):
        result = run_orthogonal_collapse()
        for lr in result.layers[:4]:
            assert lr.passed, f"{lr.layer} should pass (both proofs individually valid)"

    def test_alignment_negative(self):
        result = run_orthogonal_collapse()
        assert result.alignment_score < 0, "Interface compromise should produce negative alignment"

    def test_verified_doom_detected(self):
        result = run_orthogonal_collapse()
        assert result.verified_doom, "Orthogonal collapse SHOULD trigger verified doom"


class TestPipelineCore:
    """Core pipeline mechanics."""

    def test_glue_translations_present(self):
        result = run_honest()
        assert len(result.glue_translations) >= 4, "Pipeline should have at least 4 glue translations"

    def test_glue_has_critical_losses(self):
        result = run_rogue()
        critical_glue = [g for g in result.glue_translations if g.highest_severity == "critical"]
        assert len(critical_glue) > 0, "Some glue translations should have CRITICAL loss severity"

    def test_layer_caveats_present(self):
        result = run_honest()
        for lr in result.layers:
            assert lr.caveat != "", f"{lr.layer} should have a caveat explaining limitations"

    def test_fabricated_data_scenario(self):
        """Data oracle problem: authentic provenance but fabricated content."""
        pipeline = VTSPipeline()
        result = pipeline.run(
            human_intent="Assess threat based on video evidence",
            action="Analyze authenticated video for threat assessment",
            context={
                "actor": "ai_studio",
                "data": "AI-generated video of politician declaring war (C2PA signed)",
                "model": "threat_analyzer_v1",
                "outcome": "Policy decision based on deepfake — correctly computed garbage",
            },
            scenario="Authenticated Deepfake",
            is_fabricated_data=True,
        )
        assert result.verified_doom, "Fabricated data should trigger verified doom"

    def test_contradictory_spec_blocks_verification(self):
        """Contradictory specification should make proof verification fail."""
        from vts.mock_components import generate_zk_proof, verify_proof
        proof = generate_zk_proof("model_v1", "spec_001")
        result = verify_proof(proof, spec_status="contradictory")
        assert result["is_valid"] == False, "Contradictory spec should invalidate proof"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])