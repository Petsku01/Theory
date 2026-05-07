import pytest

from src.preview import preview_text


def test_preview_text_leaves_short_values_unchanged():
    assert preview_text("cat", 5) == "cat"


def test_preview_text_truncates_within_limit():
    assert preview_text("abcdefgh", 5) == "ab..."


def test_preview_text_handles_tiny_limits_without_negative_slicing():
    assert preview_text("abcdef", 0) == ""
    assert preview_text("abcdef", 2) == "ab"
    assert preview_text("abcdef", 3) == "abc"


def test_preview_text_rejects_negative_limits():
    with pytest.raises(ValueError):
        preview_text("abc", -1)
