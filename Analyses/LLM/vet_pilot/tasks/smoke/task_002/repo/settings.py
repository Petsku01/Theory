def parse_bool(value):
    if value == "true":
        return True
    if value == "false":
        return False
    raise ValueError(f"invalid boolean: {value}")
