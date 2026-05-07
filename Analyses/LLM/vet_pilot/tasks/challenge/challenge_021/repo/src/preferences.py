def merge_preferences(base, overrides):
    result = dict(base)
    for key, value in overrides.items():
        if isinstance(result.get(key), dict) and isinstance(value, dict):
            result[key].update(value)
        else:
            result[key] = value
    return result
