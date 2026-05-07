def resolve_alias(pairs, name):
    lookup = {alias.lower(): target for alias, target in pairs if alias}
    return lookup.get(name.lower(), name)
