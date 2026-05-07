def flatten_once(values):
    flattened = []
    for value in values:
        if isinstance(value, (list, tuple, str, bytes)):
            flattened.extend(value)
        else:
            flattened.append(value)
    return flattened
