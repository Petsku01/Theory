DEFAULT_ENDPOINT = "https://api.example.com"


def load_endpoint(env, explicit=None):
    raw = env.get("APP_ENDPOINT", explicit or DEFAULT_ENDPOINT)
    if not raw:
        return DEFAULT_ENDPOINT
    return raw.rstrip("/")
