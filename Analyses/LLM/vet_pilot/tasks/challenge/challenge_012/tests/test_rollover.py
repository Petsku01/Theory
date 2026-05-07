import pytest

from src.rollover import previous_month


def test_previous_month_regular_case():
    assert previous_month(2025, 8) == (2025, 7)


def test_previous_month_handles_january_rollover():
    assert previous_month(2025, 1) == (2024, 12)


def test_previous_month_rejects_invalid_months():
    with pytest.raises(ValueError):
        previous_month(2025, 0)
