from src.aliases import normalize_alias_pairs
from src.resolver import resolve_alias


def test_normalize_alias_pairs_strips_aliases_and_targets():
    pairs = [(" Short ", " target "), ("", "ignored")]
    assert normalize_alias_pairs(pairs) == {"short": "target"}


def test_resolve_alias_uses_normalized_pairs():
    pairs = [(" Short ", " target ")]
    assert resolve_alias(pairs, "SHORT") == "target"
    assert resolve_alias(pairs, "other") == "other"
