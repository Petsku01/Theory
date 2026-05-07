def collapse_blank_lines(text):
    lines = text.splitlines()
    collapsed = []
    previous_blank = False
    for line in lines:
        blank = line == ""
        if blank and previous_blank:
            continue
        collapsed.append(line)
        previous_blank = blank
    return "\n".join(collapsed)
