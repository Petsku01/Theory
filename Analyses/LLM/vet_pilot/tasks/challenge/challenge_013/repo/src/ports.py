def format_port_range(start, end):
    if start > end:
        raise ValueError("invalid range")
    return f"{start}-{end}"
