from src.urls import join_url


def test_join_url_preserves_https_scheme():
    assert join_url("https://api.example.com", "/users") == "https://api.example.com/users"


def test_join_url_handles_existing_trailing_slash():
    assert join_url("https://api.example.com/", "users") == "https://api.example.com/users"


def test_join_url_preserves_other_schemes():
    assert join_url("http://localhost:8080", "health") == "http://localhost:8080/health"
