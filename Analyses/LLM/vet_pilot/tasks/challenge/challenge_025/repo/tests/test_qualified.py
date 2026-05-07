from src.qualified import split_qualified_name


def test_split_qualified_name_handles_simple_name():
    assert split_qualified_name("Item") == ("", "Item")


def test_split_qualified_name_uses_last_dot_for_nested_modules():
    assert split_qualified_name("pkg.sub.Item") == ("pkg.sub", "Item")
