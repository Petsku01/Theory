from src.settings import DEFAULT_ENDPOINT, load_endpoint


def test_load_endpoint_uses_environment_when_no_explicit_value_is_given():
    env = {"APP_ENDPOINT": "https://staging.example.com/"}
    assert load_endpoint(env) == "https://staging.example.com"


def test_load_endpoint_prefers_explicit_value_over_environment():
    env = {"APP_ENDPOINT": "https://staging.example.com/"}
    assert load_endpoint(env, explicit="https://prod.example.com/") == "https://prod.example.com"


def test_load_endpoint_ignores_blank_environment_values():
    env = {"APP_ENDPOINT": "   "}
    assert load_endpoint(env) == DEFAULT_ENDPOINT
