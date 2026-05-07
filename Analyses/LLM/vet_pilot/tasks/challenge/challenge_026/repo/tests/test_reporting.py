import inspect

from src.reporting import build_report


def test_build_report_preserves_public_signature():
    signature = inspect.signature(build_report)
    assert list(signature.parameters) == ["entries", "include_archived"]
    assert signature.parameters["include_archived"].default is False


def test_build_report_includes_entries_without_archived_flag():
    report = build_report([
        {"name": "draft"},
        {"name": "done", "archived": False},
        {"name": "old", "archived": True},
    ])
    assert report == {
        "count": 2,
        "items": [
            {"name": "draft"},
            {"name": "done", "archived": False},
        ],
    }
