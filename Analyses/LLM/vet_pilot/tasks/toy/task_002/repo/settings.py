def parse_bool(value):
    value = value.strip().lower()
    if value == 'true':
        return True
    if value == 'false':
        return False
    raise ValueError(f'invalid boolean: {value}')
