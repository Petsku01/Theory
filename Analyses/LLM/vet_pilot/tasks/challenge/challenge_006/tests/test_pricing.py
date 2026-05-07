from decimal import Decimal

import pytest

from src.pricing import format_price


def test_format_price_formats_common_inputs():
    assert format_price(3) == "3.00"
    assert format_price("4.5") == "4.50"
    assert format_price(Decimal("7.10")) == "7.10"


def test_format_price_uses_decimal_rounding_rules():
    assert format_price("2.675") == "2.68"


def test_format_price_rejects_invalid_values():
    with pytest.raises(ValueError):
        format_price("not-a-number")
