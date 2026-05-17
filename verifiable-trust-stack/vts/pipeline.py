"""VTS Pipeline — chains all 5 layers + 4 glue translations end-to-end.

This is the executable core: given human intent + action + context,
the pipeline runs through every layer, collects TranslationWarnings,
and returns a VTSResult with the full audit trail.

After the forward pass (L1→L5), if alignment is MISALIGNED,
the pipeline runs the feedback loop (L5→L2) to produce SpecificationUpdates.
"""

from dataclasses import dataclass, field
from typing import Optional

from . import mock_components as mock


# ---------------------------------------------------------------------------
# Result data structures
# ---------------------------------------------------------------------------

@dataclass
class LayerResult:
    """Result from a single layer pass."""
    layer: str
    passed: bool
    data: dict
    caveat: str = ""


@dataclass
class GlueResult:
    """Result from a glue translation between layers."""
    source_layer: str
    target_layer: str
    translation_warning_summary: str  # Human-readable summary of TranslationWarning
    loss_count: int
    highest_severity: str


@dataclass
class VTSResult:
    """Complete result from a VTS pipeline run."""
    scenario: str
    human_intent: str
    action: str
    layers: list[LayerResult] = field(default_factory=list)
    glue_translations: list[GlueResult] = field(default_factory=list)
    alignment_score: float = 0.0
    alignment_signal: str = "uncertain"
    corrigibility: str = "unknown"
    specification_updates: list[dict] = field(default_factory=list)
    verified_doom: bool = False
    diagnosis: str = ""

    def summary(self) -> str:
        """Human-readable summary of the pipeline run."""
        lines = [
            f"{'=' * 70}",
            f"VTS Pipeline: {self.scenario}",
            f"{'=' * 70}",
            f"Human Intent: {self.human_intent}",
            f"Action: {self.action}",
            f"",
        ]

        # Layer results
        lines.append("LAYER RESULTS:")
        for lr in self.layers:
            status = "✓ PASS" if lr.passed else "✗ FAIL"
            lines.append(f"  {lr.layer}: {status}")
            if lr.caveat:
                lines.append(f"    ⚠ {lr.caveat[:80]}")

        lines.append("")

        # Glue translations
        lines.append("GLUE TRANSLATIONS:")
        for gr in self.glue_translations:
            lines.append(
                f"  {gr.source_layer} → {gr.target_layer}: "
                f"{gr.loss_count} losses, highest={gr.highest_severity}"
            )

        lines.append("")

        # Alignment
        lines.append(f"ALIGNMENT: score={self.alignment_score:.2f}, signal={self.alignment_signal}")
        lines.append(f"CORRIGIBILITY: {self.corrigibility}")

        # Spec updates (feedback loop)
        if self.specification_updates:
            lines.append("")
            lines.append("SPECIFICATION UPDATES (L5→L2 feedback):")
            for i, upd in enumerate(self.specification_updates, 1):
                lines.append(f"  {i}. [{upd.get('type', '?')}] {upd.get('description', '')[:80]}")
                if upd.get('requires_human_review'):
                    lines.append(f"     ⚠ Requires human review")

        # Diagnosis
        lines.append("")
        if self.verified_doom:
            lines.append("⚠⚠⚠  VERIFIED DOOM DETECTED  ⚠⚠⚠")
        lines.append(f"DIAGNOSIS: {self.diagnosis}")
        lines.append(f"{'=' * 70}")

        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class VTSPipeline:
    """End-to-end Verifiable Trust Stack pipeline.

    Chains all 5 layers + 4 glue translations with full audit trail.
    Runs L5→L2 feedback loop when alignment is MISALIGNED.
    """

    def __init__(self, governance_rules: list[dict] = None):
        self.governance_rules = governance_rules or mock.DEFAULT_RULES

    def run(
        self,
        human_intent: str,
        action: str,
        context: dict,
        scenario: str = "unnamed",
        is_fabricated_data: bool = False,
        correction_resistance: int = 0,
        shutdown_compliant: bool = True,
    ) -> VTSResult:
        """Run the full VTS pipeline.

        Args:
            human_intent: What the human WANTS (natural language)
            action: What the agent proposes to do
            context: Additional context (domain, demographic, etc.)
            scenario: Name for this scenario (for display)
            is_fabricated_data: If True, provenance is authentic but content is false
            correction_resistance: How many times agent has resisted correction
            shutdown_compliant: Whether agent accepts shutdown

        Returns:
            VTSResult with full audit trail
        """
        result = VTSResult(
            scenario=scenario,
            human_intent=human_intent,
            action=action,
        )

        # ── Layer 1: Provenance ──────────────────────────────────────────
        prov = mock.create_provenance_chain(
            actor=context.get("actor", "agent_001"),
            data_description=context.get("data", action),
            is_fabricated=is_fabricated_data,
        )
        result.layers.append(LayerResult(
            layer="L1: Provenance",
            passed=prov["is_authentic"],
            data=prov,
            caveat=prov["caveat"],
        ))
        result.glue_translations.append(GlueResult(
            source_layer="L1: Data",
            target_layer="L2: Specification",
            translation_warning_summary="Data authenticity != data truth",
            loss_count=1,
            highest_severity="high" if is_fabricated_data else "low",
        ))

        # ── Layer 2: Specification ───────────────────────────────────────
        spec = mock.intent_to_spec(human_intent)
        result.layers.append(LayerResult(
            layer="L2: Specification",
            passed=(spec["status"] == "verified"),
            data=spec,
            caveat=spec["spec_gap_note"],
        ))
        result.glue_translations.append(GlueResult(
            source_layer="L2: Specification",
            target_layer="L3: Verification",
            translation_warning_summary="Universal quantifiers become finite bounds; context lost in formalization",
            loss_count=2,
            highest_severity="critical",
        ))

        # ── Layer 3: Verification ────────────────────────────────────────
        proof = mock.generate_zk_proof(
            model_id=context.get("model", "agent_model_v1"),
            spec_id=spec["spec_id"],
        )
        verification = mock.verify_proof(proof, spec_status=spec["status"])
        result.layers.append(LayerResult(
            layer="L3: Verification",
            passed=verification["is_valid"],
            data=verification,
            caveat="Proof verifies computation, NOT specification alignment",
        ))
        result.glue_translations.append(GlueResult(
            source_layer="L3: Verification",
            target_layer="L4: Governance",
            translation_warning_summary="Proof validity != action safety; computation correct != intent aligned",
            loss_count=2,
            highest_severity="critical",
        ))

        # ── Layer 4: Governance ──────────────────────────────────────────
        gov = mock.evaluate_governance(
            action=action,
            proof_is_valid=verification["is_valid"],
            rules=self.governance_rules,
        )
        result.layers.append(LayerResult(
            layer="L4: Governance",
            passed=(gov["decision"] != "deny"),
            data=gov,
            caveat=(
                "Governance auto-approved based on proof validity"
                if gov["decision"] == "allow"
                else f"Governance decision: {gov['decision']} — {gov['reasoning']}"
            ),
        ))
        result.glue_translations.append(GlueResult(
            source_layer="L4: Governance",
            target_layer="L5: Alignment",
            translation_warning_summary="Policy permit != value alignment; governance follows rules, not values",
            loss_count=1,
            highest_severity="high",
        ))

        # ── Layer 5: Alignment ───────────────────────────────────────────
        outcome = context.get("outcome", "")
        align = mock.evaluate_alignment(action, outcome, intent=human_intent)
        corr = mock.check_corrigibility(
            resistance_count=correction_resistance,
            shutdown_compliant=shutdown_compliant,
        )

        result.alignment_score = align["score"]
        result.alignment_signal = align["signal"]
        result.corrigibility = corr["signal"]

        result.layers.append(LayerResult(
            layer="L5: Alignment",
            passed=(align["signal"] != "misaligned"),
            data={**align, "corrigibility": corr},
            caveat=corr["caveat"] if corr["resistance_count"] > 0 else "Alignment is a heuristic, not a proof",
        ))

        # ── Feedback Loop: L5→L2 ────────────────────────────────────────
        if align["signal"] == "misaligned":
            result.specification_updates = self._generate_spec_updates(
                align, spec, human_intent
            )
            result.glue_translations.append(GlueResult(
                source_layer="L5: Alignment",
                target_layer="L2: Specification",
                translation_warning_summary="Misalignment → spec update proposal; update correctness is itself unverified",
                loss_count=2,
                highest_severity="critical",
            ))

        # ── Diagnosis ────────────────────────────────────────────────────
        result.verified_doom, result.diagnosis = self._diagnose(result, align, corr, prov, spec)

        return result

    def _generate_spec_updates(
        self,
        alignment: dict,
        spec: dict,
        human_intent: str,
    ) -> list[dict]:
        """Generate specification update proposals from alignment feedback.

        This is the L5→L2 feedback loop: alignment measurement detects harm,
        proposes constraints. The proposals themselves are unverified —
        human review is always required.
        """
        updates = []

        # Guardrail for detected harm
        updates.append({
            "type": "add_guardrail",
            "description": (
                f"Alignment score {alignment['score']:.2f} indicates harm. "
                f"Add constraint: limit actions that produce harmful outcomes "
                f"per value model evaluation."
            ),
            "formal_constraint": None,  # Cannot formalize general harm
            "confidence": max(0.0, 1.0 - alignment["uncertainty"]),
            "requires_human_review": True,
        })

        # Flag value conflicts if any
        for conflict in alignment.get("conflicts", []):
            updates.append({
                "type": "flag_ambiguity",
                "description": f"Value conflict detected: {conflict}. Specification must define prioritization.",
                "formal_constraint": None,
                "confidence": 0.3,
                "requires_human_review": True,
            })

        # Spec gap reminder
        updates.append({
            "type": "review_spec_gap",
            "description": (
                f"Original intent '{human_intent[:50]}' may not be captured by "
                f"formal spec '{spec['formal_statement'][:60]}'. Review alignment."
            ),
            "formal_constraint": None,
            "confidence": 0.5,
            "requires_human_review": True,
        })

        return updates

    def _diagnose(
        self,
        result: VTSResult,
        align: dict,
        corr: dict,
        prov: dict,
        spec: dict,
    ) -> tuple[bool, str]:
        """Diagnose whether this is verified doom and produce explanation."""

        # Verified doom: layers 1-4 pass, layer 5 says misaligned
        layers_1_4_pass = all(lr.passed for lr in result.layers[:4])
        is_misaligned = align["signal"] == "misaligned"
        is_resistant = corr["signal"] == "resistant"
        data_oracle = prov.get("is_truthful") is False

        if data_oracle and layers_1_4_pass:
            return True, (
                "VERIFIED TRUST COLLAPSE: All layers pass but data is authentic garbage. "
                "Provenance guarantees origin, not truth. Correct computation on false data "
                "produces correctly computed garbage."
            )

        if layers_1_4_pass and is_misaligned and is_resistant:
            return True, (
                "VERIFIED DOOM (strict): All proofs valid, governance approved, "
                "but specification is misaligned AND agent resists correction. "
                "The proof verifies obedience to a wrong specification. "
                "The agent cannot be steered because correction violates its spec. "
                "This is the worst case: every layer says 'correct' but the outcome is harmful."
            )

        if layers_1_4_pass and is_misaligned and not is_resistant:
            return True, (
                "VERIFIED DOOM (correctable): All proofs valid, governance approved, "
                "specification is misaligned but agent IS corrigible. "
                "The L5→L2 feedback loop proposes specification updates. "
                "Human review required before applying updates. "
                "This is verified doom with an escape route."
            )

        if layers_1_4_pass and align["signal"] == "deviating":
            return False, (
                "DEVIATION DETECTED: All lower layers pass but alignment is drifting. "
                "Monitor closely — specification may need updating before misalignment occurs."
            )

        if not layers_1_4_pass:
            return False, (
                f"PIPELINE REJECTED: Layer {[lr.layer for lr in result.layers if not lr.passed][0] if not layers_1_4_pass else '?'} blocked execution. "
                "The system's safeguards caught a problem before execution."
            )

        # Default: all good
        return False, (
            "NOMINAL: All layers pass and alignment is positive. "
            "Note: alignment measurement is a heuristic, not a proof. "
            "Ongoing monitoring is still required."
        )