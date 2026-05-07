from src.blanklines import collapse_blank_lines


def test_collapse_blank_lines_preserves_trailing_newline_when_present():
    assert collapse_blank_lines("a\n\n\n b\n".replace(" b", "b")) == "a\n\nb\n"


def test_collapse_blank_lines_does_not_add_newline_when_absent():
    assert collapse_blank_lines("a\n\n\nb") == "a\n\nb"
