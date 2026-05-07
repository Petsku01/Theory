from src.recent import collect_recent


def test_collect_recent_returns_recent_slice_without_mutating_input():
    history = ["a", "b"]
    assert collect_recent(history, "c", 2) == ["b", "c"]
    assert history == ["a", "b"]


def test_collect_recent_preserves_limit_zero_behavior_without_mutation():
    history = ["a"]
    assert collect_recent(history, "b", 0) == []
    assert history == ["a"]
