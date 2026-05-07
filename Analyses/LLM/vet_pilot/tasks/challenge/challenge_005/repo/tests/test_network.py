from src.network import parse_host_port


def test_parse_host_port_supports_simple_hosts():
    assert parse_host_port("example.com:443") == ("example.com", 443)


def test_parse_host_port_uses_default_for_missing_port():
    assert parse_host_port("example.com:", default_port=8080) == ("example.com", 8080)


def test_parse_host_port_supports_bracketed_ipv6():
    assert parse_host_port("[::1]:8080") == ("::1", 8080)
    assert parse_host_port("[2001:db8::1]", default_port=9000) == ("2001:db8::1", 9000)
