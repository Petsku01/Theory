class Backend:
    kind = "file"


    def put(self, key, value):
        return f"{key}={value}"
