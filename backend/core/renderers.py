from rest_framework.renderers import JSONRenderer


class UTF8JSONRenderer(JSONRenderer):
    """
    JSON renderer that always uses UTF-8 and does not escape non-ASCII characters.

    This guarantees responses are emitted with an explicit charset so clients
    render dealer names and notes correctly.
    """

    charset = "utf-8"
    ensure_ascii = False
