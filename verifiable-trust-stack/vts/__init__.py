"""Verifiable Trust Stack — runnable end-to-end prototype."""

from .pipeline import VTSPipeline, VTSResult
from .scenarios import run_honest, run_rogue, run_orthogonal_collapse, run_all
from .formal import (
    Severity,
    AlignmentSignal,
    CorrigibilitySignal,
    LayerProperty,
    TranslationLoss,
    Translation,
    VerifiedDoomResult,
    VulnerabilitySet,
    evaluate_verified_doom,
    TRANSLATION_REGISTRY,
    TOTAL_GAP,
)

__all__ = [
    "VTSPipeline", "VTSResult",
    "run_honest", "run_rogue", "run_orthogonal_collapse", "run_all",
    "Severity", "AlignmentSignal", "CorrigibilitySignal",
    "LayerProperty", "TranslationLoss", "Translation",
    "VerifiedDoomResult", "VulnerabilitySet",
    "evaluate_verified_doom",
    "TRANSLATION_REGISTRY", "TOTAL_GAP",
]