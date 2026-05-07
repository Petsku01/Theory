from settings import parse_bool

def test_parse_bool_lowercase():
    assert parse_bool("true") is True
    assert parse_bool("false") is False

def test_parse_bool_whitespace_and_case():
    assert parse_bool(" TRUE ") is True
    assert parse_bool(" false ") is False
