import pytest

from src.users import normalize_username


def test_normalize_username_lowercases_valid_input():
    assert normalize_username("Alice_01") == "alice_01"


def test_normalize_username_rejects_outer_whitespace():
    with pytest.raises(ValueError):
        normalize_username(" alice")

    with pytest.raises(ValueError):
        normalize_username("alice ")


def test_normalize_username_still_rejects_internal_spaces():
    with pytest.raises(ValueError):
        normalize_username("alice smith")
