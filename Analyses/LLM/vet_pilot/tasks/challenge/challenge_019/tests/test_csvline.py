from src.csvline import split_csv_line


def test_split_csv_line_handles_plain_values():
    assert split_csv_line("alpha,beta,gamma") == ["alpha", "beta", "gamma"]


def test_split_csv_line_keeps_quoted_commas_together():
    assert split_csv_line('alpha,"beta,gamma",delta') == ["alpha", "beta,gamma", "delta"]
