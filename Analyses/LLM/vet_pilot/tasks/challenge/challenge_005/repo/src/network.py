def parse_host_port(value: str, default_port: int = 80) -> tuple[str, int]:
    host, sep, port_text = value.partition(":")
    if not sep:
        return value, default_port
    if port_text == "":
        return host, default_port
    return host, int(port_text)
