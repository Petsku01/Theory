def join_segments(segments):
    cleaned = [segment.strip("/") for segment in segments if segment]
    return "/".join(cleaned)
