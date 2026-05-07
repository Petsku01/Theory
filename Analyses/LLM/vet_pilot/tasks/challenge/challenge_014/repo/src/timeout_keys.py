TIMEOUT_KEY = "timeout"


def normalize_timeout(value):
    return {TIMEOUT_KEY: int(value)}
