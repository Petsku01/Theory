import pytest

from src.backend_loader import load_backend


def test_load_backend_supports_short_names():
    backend = load_backend("memory")
    assert backend.kind == "memory"


def test_load_backend_supports_fully_qualified_modules():
    backend = load_backend("src.backends.file_backend")
    assert backend.kind == "file"


def test_load_backend_raises_value_error_for_unknown_backend():
    with pytest.raises(ValueError):
        load_backend("missing_backend")
