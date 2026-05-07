def parse_bool(value: str) -> bool:
    if value == "true":
        return True
    if value == "false":
        return False
    raise ValueError(f"invalid boolean: {value}")


def parse_optional_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    return int(value)
