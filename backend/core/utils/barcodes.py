import secrets
import string


def generate_barcode() -> str:
    """Generate a pseudo unique numeric barcode compatible with Code128 scanners."""
    digits = ''.join(secrets.choice(string.digits) for _ in range(9))
    checksum = secrets.choice(string.digits)
    return f"128{digits}{checksum}"
