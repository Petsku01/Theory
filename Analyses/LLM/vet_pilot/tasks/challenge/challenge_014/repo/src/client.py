from src.timeout_keys import normalize_timeout

DEFAULT_TIMEOUT = 30


def build_request_options(timeout_value=None):
    options = {"connect_timeout": DEFAULT_TIMEOUT}
    if timeout_value is None:
        return options
    parsed = normalize_timeout(timeout_value)
    options["connect_timeout"] = parsed.get("timeout", DEFAULT_TIMEOUT)
    return options
