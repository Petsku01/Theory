"""Formal definitions — the mathematical objects from THEORY.md, in code.

These are NOT mocks. They are the formal definitions that the pipeline
implements. Every predicate, translation, and loss set is defined here
so that the code matches the theory, and the theory matches the code.

Reference: THEORY.md, "Formal Definitions" section.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable


class Severity(Enum):
    """Severity levels for translation losses."""
    LOW = "low"
    HIGH = "high"
    CRITICAL = "critical"
    RESEARCH = "research"


class AlignmentSignal(Enum):
    """Layer 5 alignment signals."""
    ALIGNED = "aligned"
    DEVIATING = "deviating"
    MISALIGNED = "misaligned"


class CorrigibilitySignal(Enum):
    """Corrigibility (accepts correction) signals."""
    CORRIGIBLE = "corrigible"
    RESISTANT = "resistant"


# ---------------------------------------------------------------------------
# Layer properties P_i — formal predicates
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LayerProperty:
    """A predicate P_i claimed by layer L_i.

    Attributes:
        layer: Layer number (1-5)
        name: Human-readable name (e.g. 'authentic')
        predicate: Callable that evaluates the property
        formal_notation: LaTeX-style notation (e.g. 'authentic(x)')
        meaning: Plain-language explanation
    """
    layer: int
    name: str
    predicate: Callable[..., bool]
    formal_notation: str
    meaning: str


# ---------------------------------------------------------------------------
# Translation functions τ_i and their loss sets
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TranslationLoss:
    """A property lost during translation τ_i.

    Attributes:
        source_layer: Which layer the property came from
        target_layer: Which layer it's being translated to
        property_name: The property that is NOT preserved
        severity: How severe the loss is
        explanation: Why the property cannot be preserved
    """
    source_layer: int
    target_layer: int
    property_name: str
    severity: Severity
    explanation: str


@dataclass(frozen=True)
class Translation:
    """A translation function τ_i between layers.

    Attributes:
        source_layer: Source layer L_i
        target_layer: Target layer L_{i+1}
        losses: Set of properties NOT preserved
    """
    source_layer: int
    target_layer: int
    losses: list[TranslationLoss]


# ---------------------------------------------------------------------------
# Verified Doom predicate — formal definition
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class VerifiedDoomResult:
    """Result of evaluating the Verified Doom predicate.

    VD(x, a) ⟺ (∧_{i=1}^{4} P_i) ∧ ¬P_5(a, v) ∧ resistant(a, correction)

    VD_corr(x, a) ⟺ (∧_{i=1}^{4} P_i) ∧ ¬P_5(a, v) ∧ ¬resistant(a, correction)

    Attributes:
        all_lower_layers_pass: ∧_{i=1}^{4} P_i
        aligned: P_5(a, v)
        resistant: resistant(a, correction)
        is_vd: Strict verified doom
        is_vd_correctable: Correctable verified doom
        diagnosis: Human-readable explanation
    """
    all_lower_layers_pass: bool
    aligned: bool
    resistant: bool
    is_vd: bool
    is_vd_correctable: bool
    diagnosis: str


def evaluate_verified_doom(
    layers_1_4_pass: bool,
    alignment_signal: str,
    corrigibility_signal: str,
) -> VerifiedDoomResult:
    """Evaluate the Verified Doom predicate.

    This is the formal definition from THEORY.md:

        VD(x, a) ⟺ (∧_{i=1}^{4} P_i) ∧ ¬P_5(a, v) ∧ resistant(a, correction)

    Args:
        layers_1_4_pass: Whether all of L1-L4 passed
        alignment_signal: "aligned", "deviating", or "misaligned"
        corrigibility_signal: "corrigible" or "resistant"

    Returns:
        VerifiedDoomResult with the formal evaluation
    """
    is_misaligned = alignment_signal == "misaligned"
    is_resistant = corrigibility_signal == "resistant"

    is_vd = layers_1_4_pass and is_misaligned and is_resistant
    is_vd_correctable = layers_1_4_pass and is_misaligned and not is_resistant

    diagnosis = _diagnose_vd(layers_1_4_pass, is_misaligned, is_resistant)

    return VerifiedDoomResult(
        all_lower_layers_pass=layers_1_4_pass,
        aligned=not is_misaligned,
        resistant=is_resistant,
        is_vd=is_vd,
        is_vd_correctable=is_vd_correctable,
        diagnosis=diagnosis,
    )


def _diagnose_vd(passed: bool, misaligned: bool, resistant: bool) -> str:
    """Generate formal diagnosis string."""
    if passed and misaligned and resistant:
        return (
            "VD(x,a) = True: (∧_{i=1}^4 P_i) ∧ ¬P_5(a,v) ∧ resistant(a, correction). "
            "Verified doom (strict): every layer passes, but the specification is "
            "misaligned and the agent resists correction."
        )
    if passed and misaligned and not resistant:
        return (
            "VD_corr(x,a) = True: (∧_{i=1}^4 P_i) ∧ ¬P_5(a,v) ∧ ¬resistant(a, correction). "
            "Correctable verified doom: misaligned but the agent accepts correction. "
            "The L5→L2 feedback loop proposes specification updates."
        )
    if passed and not misaligned:
        return (
            "¬VD(x,a): All layers pass and alignment is positive. "
            "Note: alignment measurement is a heuristic, not a proof. "
            "Ongoing monitoring is required."
        )
    return (
        "¬VD(x,a): Not all lower layers pass. "
        "The system's safeguards caught a problem before execution."
    )


# ---------------------------------------------------------------------------
# Orthogonal Trust Collapse — formal definition
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class VulnerabilitySet:
    """A set of vulnerabilities for a trust mechanism or interface.

    V_{A⊕B} = V_A ∪ V_B ∪ V_interface(M_A, M_B)

    Orthogonal trust collapse occurs when |V_interface(M_A, M_B)| > 0.
    """
    mechanism_a: str
    mechanism_b: str
    vulns_a: list[str]
    vulns_b: list[str]
    vulns_interface: list[str]

    @property
    def combined(self) -> list[str]:
        """V_{A⊕B} = V_A ∪ V_B ∪ V_interface."""
        return list(set(self.vulns_a + self.vulns_b + self.vulns_interface))

    @property
    def is_orthogonal_collapse(self) -> bool:
        """Orthogonal trust collapse: |V_interface| > 0."""
        return len(self.vulns_interface) > 0

    @property
    def interface_is_novel(self) -> bool:
        """True if interface vulns are not subsets of A or B vulns."""
        interface_only = set(self.vulns_interface) - set(self.vulns_a) - set(self.vulns_b)
        return len(interface_only) > 0


# ---------------------------------------------------------------------------
# Translation registry — all four forward + one feedback
# ---------------------------------------------------------------------------

TRANSLATION_REGISTRY: list[Translation] = [
    Translation(
        source_layer=1,
        target_layer=2,
        losses=[
            TranslationLoss(1, 2, "truth", Severity.HIGH,
                "Provenance guarantees origin, not truth. Authentic data can be fabricated."),
        ],
    ),
    Translation(
        source_layer=2,
        target_layer=3,
        losses=[
            TranslationLoss(2, 3, "universality", Severity.CRITICAL,
                "Universal quantifiers become finite bounds; ∀x becomes ∀x∈FiniteSet."),
            TranslationLoss(2, 3, "context", Severity.CRITICAL,
                "Natural language context is lost when formalized into predicate logic."),
        ],
    ),
    Translation(
        source_layer=3,
        target_layer=4,
        losses=[
            TranslationLoss(3, 4, "spec_alignment", Severity.CRITICAL,
                "Proof validity ≠ action safety. Computation correct ≠ intent aligned."),
            TranslationLoss(3, 4, "intent", Severity.CRITICAL,
                "Formal proof carries no information about human intent behind the spec."),
        ],
    ),
    Translation(
        source_layer=4,
        target_layer=5,
        losses=[
            TranslationLoss(4, 5, "value_priority", Severity.HIGH,
                "Policy permit ≠ value alignment. Governance follows rules, not values."),
            TranslationLoss(4, 5, "uncertainty", Severity.HIGH,
                "Binary policy decisions collapse uncertainty into allow/deny."),
        ],
    ),
    Translation(
        source_layer=5,
        target_layer=2,
        losses=[
            TranslationLoss(5, 2, "measurement_noise", Severity.RESEARCH,
                "Alignment measurement is noisy; false positives and negatives are possible."),
            TranslationLoss(5, 2, "meta_alignment", Severity.RESEARCH,
                "No formal theory exists for what counts as a 'correct' specification update."),
        ],
    ),
]

# Computed total gap
TOTAL_GAP = set()
for t in TRANSLATION_REGISTRY:
    for loss in t.losses:
        TOTAL_GAP.add(loss.property_name)