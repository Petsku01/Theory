def normalize_alias_pairs(pairs):
    normalized = {}
    for alias, target in pairs:
        normalized[alias.strip().lower()] = target
    return normalized
