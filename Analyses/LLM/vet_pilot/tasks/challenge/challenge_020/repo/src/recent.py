def collect_recent(history, item, limit):
    history.append(item)
    if limit <= 0:
        return []
    return history[-limit:]
