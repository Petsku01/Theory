def build_headers(token, extra=None):
    extra = extra or {}
    extra.setdefault("Accept", "application/json")
    if token:
        extra["Authorization"] = token
    return extra
