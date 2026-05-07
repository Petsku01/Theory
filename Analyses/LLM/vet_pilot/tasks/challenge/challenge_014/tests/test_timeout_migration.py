from src.client import build_request_options
from src.timeout_keys import normalize_timeout


def test_normalize_timeout_uses_connect_timeout_key():
    assert normalize_timeout("15") == {"connect_timeout": 15}


def test_build_request_options_uses_shared_timeout_key():
    assert build_request_options("15") == {"connect_timeout": 15}


def test_build_request_options_preserves_default():
    assert build_request_options() == {"connect_timeout": 30}
