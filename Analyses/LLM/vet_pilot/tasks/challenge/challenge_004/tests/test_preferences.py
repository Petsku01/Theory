from src.preferences import merge_preferences


def test_merge_preferences_combines_values():
    defaults = {"notifications": {"email": True}, "tags": ["core"], "theme": "light"}
    overrides = {"notifications": {"sms": False}, "tags": ["beta"], "theme": "dark"}

    merged = merge_preferences(defaults, overrides)

    assert merged == {
        "notifications": {"email": True, "sms": False},
        "tags": ["core", "beta"],
        "theme": "dark",
    }


def test_merge_preferences_does_not_mutate_defaults():
    defaults = {"notifications": {"email": True}, "tags": ["core"]}
    overrides = {"notifications": {"sms": False}, "tags": ["beta"]}

    merged = merge_preferences(defaults, overrides)

    assert defaults == {"notifications": {"email": True}, "tags": ["core"]}

    merged["notifications"]["push"] = True
    merged["tags"].append("new")
    assert defaults == {"notifications": {"email": True}, "tags": ["core"]}
