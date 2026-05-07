import inspect

from src.http_headers import build_headers


def test_build_headers_preserves_signature():
    assert tuple(inspect.signature(build_headers).parameters) == ("token", "extra")


def test_build_headers_returns_new_mapping():
    extra = {"X-Trace": "abc"}
    headers = build_headers("secret", extra)

    assert headers is not extra
    assert extra == {"X-Trace": "abc"}


def test_build_headers_sets_bearer_authorization_and_default_accept():
    headers = build_headers("secret", {"X-Trace": "abc"})
    assert headers["Authorization"] == "Bearer secret"
    assert headers["Accept"] == "application/json"
    assert headers["X-Trace"] == "abc"
