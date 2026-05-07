def normalize_tag_list(text):
    return sorted({part.lower() for part in text.split(",") if part})
