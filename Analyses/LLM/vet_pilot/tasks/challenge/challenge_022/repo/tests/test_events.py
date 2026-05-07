from src.events import take_ready_events


def test_take_ready_events_returns_ready_prefix():
    events = [
        {"name": "warmup", "ready": True},
        {"name": "prime", "ready": True},
        {"name": "deploy", "ready": False},
    ]
    assert take_ready_events(events) == [
        {"name": "warmup", "ready": True},
        {"name": "prime", "ready": True},
    ]


def test_take_ready_events_does_not_mutate_input_list():
    events = [
        {"name": "warmup", "ready": True},
        {"name": "deploy", "ready": False},
    ]
    take_ready_events(events)
    assert events == [
        {"name": "warmup", "ready": True},
        {"name": "deploy", "ready": False},
    ]
