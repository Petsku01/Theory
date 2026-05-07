from src.parsers import parse_tags
from src.service import normalize_tag_list


def test_parse_tags_strips_and_discards_empty_entries():
    assert parse_tags("alpha, beta ,, gamma ") == ["alpha", "beta", "gamma"]


def test_normalize_tag_list_uses_shared_parser_behavior():
    assert normalize_tag_list("Alpha, beta ,, alpha ") == ["alpha", "beta"]
