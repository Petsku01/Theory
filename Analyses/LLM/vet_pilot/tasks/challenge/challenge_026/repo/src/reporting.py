def build_report(entries, include_archived=False):
    visible = [entry for entry in entries if include_archived or entry.get("archived") is False]
    return {"count": len(visible), "items": visible}
