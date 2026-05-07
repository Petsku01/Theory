import importlib


def load_backend(name: str):
    module = importlib.import_module(name)
    return module.Backend()
