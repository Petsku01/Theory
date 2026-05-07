def split_qualified_name(name):
    if "." not in name:
        return "", name
    module, item = name.split(".", 1)
    return module, item
