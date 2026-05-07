def render_preview(text, limit):
    if limit < 0:
        raise ValueError("limit must be non-negative")
    if len(text) <= limit:
        return text
    return text[:limit] + "..."
