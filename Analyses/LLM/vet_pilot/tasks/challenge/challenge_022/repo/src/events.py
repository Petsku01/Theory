def take_ready_events(events):
    ready = []
    while events and events[0]["ready"]:
        ready.append(events.pop(0))
    return ready
