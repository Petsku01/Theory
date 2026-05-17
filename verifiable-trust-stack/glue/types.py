"""Shared types for translation-loss tracking across all glue modules.

Previously duplicated in all four glue modules — now canonical here.
"""

from dataclasses import dataclass, field
from enum import Enum


class TranslationLossSeverity(Enum):
    """Severity levels for information lost during layer-to-layer translation."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class TranslationLoss:
    """A single piece of information lost or distorted during translation between layers."""
    severity: TranslationLossSeverity
    what_is_lost: str
    what_is_assumed: str
    mitigation: str


@dataclass
class TranslationWarning:
    """Aggregate warning about translation losses between two layers.

    Carries structured loss data so that governance (Layer 4) can auto-escalate
    when critical translation losses are detected.
    """
    losses: list[TranslationLoss] = field(default_factory=list)
    source_layer: str = ""
    target_layer: str = ""

    @property
    def overall_severity(self) -> TranslationLossSeverity:
        """Computed from highest loss severity among all listed losses."""
        severity_order = [
            TranslationLossSeverity.LOW,
            TranslationLossSeverity.MEDIUM,
            TranslationLossSeverity.HIGH,
            TranslationLossSeverity.CRITICAL,
        ]
        max_index = 0
        for loss in self.losses:
            idx = severity_order.index(loss.severity)
            if idx > max_index:
                max_index = idx
        return severity_order[max_index] if self.losses else TranslationLossSeverity.LOW