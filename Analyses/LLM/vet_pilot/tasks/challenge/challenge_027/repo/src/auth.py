def build_auth_header(token, scheme="Bearer"):
    if not token:
        raise ValueError("missing token")
    return f"{scheme} {token}"
