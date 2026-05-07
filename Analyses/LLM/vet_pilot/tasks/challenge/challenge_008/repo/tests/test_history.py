from src.history import recent_unique


def test_recent_unique_keeps_most_recent_occurrences():
    assert recent_unique(["a", "b", "a", "c", "b", "d"], 3) == ["c", "b", "d"]


def test_recent_unique_preserves_chronological_order():
    assert recent_unique(["a", "b", "c", "a", "d"], 10) == ["b", "c", "a", "d"]


def test_recent_unique_handles_non_positive_limits():
    assert recent_unique(["a", "b"], 0) == []
