def previous_month(year, month):
    if month < 1 or month > 12:
        raise ValueError("invalid month")
    return year, max(month - 1, 1)
