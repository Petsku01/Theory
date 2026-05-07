from src.settings import load_settings


def test_load_settings_uses_defaults():
    assert load_settings({}) == {"debug": False, "port": 8000, "timeout": 30}


def test_load_settings_parses_trimmed_env_values():
    settings = load_settings({
        "APP_PORT": " 9001 ",
        "APP_TIMEOUT": " 15 ",
        "APP_DEBUG": " TRUE ",
    })
    assert settings == {"debug": True, "port": 9001, "timeout": 15}


def test_blank_port_does_not_override_default():
    settings = load_settings({"APP_PORT": " ", "APP_TIMEOUT": "0"})
    assert settings["port"] == 8000
    assert settings["timeout"] == 0
