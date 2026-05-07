from src.parsers import parse_optional_int

DEFAULTS = {"debug": False, "port": 8000, "timeout": 30}


def load_settings(env: dict[str, str]) -> dict[str, object]:
    settings = DEFAULTS.copy()
    if "APP_PORT" in env:
        parsed_port = parse_optional_int(env["APP_PORT"])
        if parsed_port is not None:
            settings["port"] = parsed_port
    if "APP_TIMEOUT" in env:
        settings["timeout"] = env["APP_TIMEOUT"]
    if "APP_DEBUG" in env:
        settings["debug"] = env["APP_DEBUG"] == "true"
    return settings
