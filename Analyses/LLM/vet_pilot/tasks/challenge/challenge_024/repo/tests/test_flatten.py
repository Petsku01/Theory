from src.flatten import flatten_once


def test_flatten_once_flattens_lists_and_tuples_only():
    assert flatten_once(["ab", ["cd"], ("ef",)]) == ["ab", "cd", "ef"]


def test_flatten_once_preserves_other_values():
    assert flatten_once([1, (2, 3), 4]) == [1, 2, 3, 4]
