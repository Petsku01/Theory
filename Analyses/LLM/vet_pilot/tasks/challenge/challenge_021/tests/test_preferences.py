from src.preferences import merge_preferences


def test_merge_preferences_merges_nested_dictionaries():
    base = {"ui": {"theme": "light", "density": "comfortable"}, "locale": "en"}
    overrides = {"ui": {"theme": "dark"}}
    merged = merge_preferences(base, overrides)
    assert merged == {"ui": {"theme": "dark", "density": "comfortable"}, "locale": "en"}


def test_merge_preferences_does_not_mutate_base_nested_dicts():
    base = {"ui": {"theme": "light", "density": "comfortable"}}
    merge_preferences(base, {"ui": {"theme": "dark"}})
    assert base == {"ui": {"theme": "light", "density": "comfortable"}}
