import pytest

from src.batches import split_batches


def test_split_batches_groups_items():
    assert split_batches([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]


def test_split_batches_rejects_non_positive_sizes():
    with pytest.raises(ValueError):
        split_batches([1, 2], 0)

    with pytest.raises(ValueError):
        split_batches([1, 2], -2)
