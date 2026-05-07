from src.domains import parent_domain


def test_parent_domain_regular_hostname():
    assert parent_domain("api.example.com") == "example.com"


def test_parent_domain_strips_trailing_dot():
    assert parent_domain("api.example.com.") == "example.com"


def test_parent_domain_returns_empty_for_single_label_hosts():
    assert parent_domain("localhost") == ""
