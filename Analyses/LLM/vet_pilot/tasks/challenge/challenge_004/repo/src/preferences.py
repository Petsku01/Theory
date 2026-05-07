def merge_preferences(defaults: dict, overrides: dict) -> dict:
    merged = defaults.copy()
    notifications = merged.setdefault("notifications", {})
    notifications.update(overrides.get("notifications", {}))
    tags = merged.setdefault("tags", [])
    tags.extend(overrides.get("tags", []))
    for key, value in overrides.items():
        if key not in {"notifications", "tags"}:
            merged[key] = value
    return merged
