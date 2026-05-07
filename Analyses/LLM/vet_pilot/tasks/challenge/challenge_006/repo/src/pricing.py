def format_price(value) -> str:
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError) as exc:
        raise ValueError("invalid price") from exc
