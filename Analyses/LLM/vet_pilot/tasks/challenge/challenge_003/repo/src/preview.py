def preview_text(text: str, limit: int) -> str:
    if limit < 0:
        raise ValueError("limit must be non-negative")
    if len(text) <= limit:
        return text
    return text[:limit] + "..."
