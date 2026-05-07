def parent_domain(hostname):
    parts = hostname.split(".")
    if len(parts) < 2:
        return ""
    return ".".join(parts[1:])
