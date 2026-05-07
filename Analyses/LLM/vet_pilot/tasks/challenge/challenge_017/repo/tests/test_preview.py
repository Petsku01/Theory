import pytest

from src.preview import render_preview


def test_render_preview_respects_longer_limit():
    assert render_preview("alphabet", 8) == "alphabet"


def test_render_preview_never_exceeds_limit():
    assert render_preview("alphabet", 5) == "al..."


def test_render_preview_handles_tiny_limits_without_ellipsis():
    assert render_preview("alphabet", 3) == "alp"


def test_render_preview_rejects_negative_limits():
    with pytest.raises(ValueError):
        render_preview("alphabet", -1)
