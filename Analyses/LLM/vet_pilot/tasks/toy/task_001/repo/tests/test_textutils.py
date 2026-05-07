from textutils import slugify

def test_basic_slugify():
    assert slugify("Hello World") == "hello-world"

def test_collapse_and_trim_hyphens():
    assert slugify("  Hello---World!!! ") == "hello-world"
