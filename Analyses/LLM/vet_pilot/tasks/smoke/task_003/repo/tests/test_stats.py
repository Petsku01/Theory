import pytest
from stats import median

def test_median_odd_even():
    assert median([3, 1, 2]) == 2
    assert median([1, 2, 3, 4]) == 2.5

def test_median_empty():
    with pytest.raises(ValueError):
        median([])
