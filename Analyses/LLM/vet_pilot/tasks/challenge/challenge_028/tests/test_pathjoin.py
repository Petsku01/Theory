from src.pathjoin import join_segments


def test_join_segments_preserves_relative_paths():
    assert join_segments(["api", "v1", "users"]) == "api/v1/users"


def test_join_segments_preserves_absolute_root_marker():
    assert join_segments(["", "api", "", "v1"]) == "/api/v1"


def test_join_segments_handles_root_only():
    assert join_segments(["", ""]) == "/"
