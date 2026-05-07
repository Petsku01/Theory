import re

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,20}$")


def normalize_username(username: str) -> str:
    candidate = username.strip().lower()
    if not USERNAME_RE.fullmatch(candidate):
        raise ValueError("invalid username")
    return candidate
