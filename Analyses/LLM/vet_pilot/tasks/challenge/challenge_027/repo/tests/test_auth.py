import inspect
import pytest

from src.auth import build_auth_header


def test_build_auth_header_preserves_public_signature():
    signature = inspect.signature(build_auth_header)
    assert list(signature.parameters) == ["token", "scheme"]
    assert signature.parameters["scheme"].default == "Bearer"


def test_build_auth_header_trims_token_before_formatting():
    assert build_auth_header(" secret ") == "Bearer secret"


def test_build_auth_header_rejects_blank_tokens_after_trimming():
    with pytest.raises(ValueError):
        build_auth_header("   ")
