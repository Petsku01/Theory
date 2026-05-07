def median(values):
    values = sorted(values)
    n = len(values)
    if n == 0:
        raise ValueError("median requires at least one value")
    mid = n // 2
    if n % 2:
        return values[mid]
    return (values[mid - 1] + values[mid]) / 2
