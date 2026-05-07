from src.timeouts import resolve_timeout


def test_resolve_timeout_uses_default_when_missing():
    assert resolve_timeout(None, 30) == 30


def test_resolve_timeout_preserves_explicit_zero():
    assert resolve_timeout(0, 30) == 0


def test_resolve_timeout_preserves_non_zero_values():
    assert resolve_timeout(5, 30) == 5
