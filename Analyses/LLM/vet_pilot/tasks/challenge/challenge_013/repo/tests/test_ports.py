import pytest

from src.ports import format_port_range


def test_format_port_range_renders_span():
    assert format_port_range(8000, 8010) == "8000-8010"


def test_format_port_range_renders_singleton_without_dash():
    assert format_port_range(443, 443) == "443"


def test_format_port_range_rejects_reversed_ranges():
    with pytest.raises(ValueError):
        format_port_range(10, 1)
