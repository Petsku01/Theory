def split_batches(items, size):
    if size == 0:
        return [list(items)]
    return [list(items[index:index + size]) for index in range(0, len(items), size)]
