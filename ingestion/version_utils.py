import re

SUPPORTED_VERSIONS = ["3.11.15", "3.12", "3.13", "3.14"]
DEFAULT_VERSION = "3.14"

def detect_version(query: str) -> str | None:
    """
    Look for a Python version mentioned in the query (e.g. '3.12', 'python 3.14').
    Returns the matched supported version, or None if no version is found.
    """
    # Match patterns like "3.12", "3.11.15", "3.14" — with a dot required
    # so we don't accidentally match unrelated numbers like "3" or "12"
    pattern = r"\b3\.(\d{1,2})(?:\.\d{1,2})?\b"
    match = re.search(pattern, query)

    if not match:
        return None

    minor = match.group(1)
    matched_str = f"3.{minor}"

    # Map to your actual supported versions
    version_map = {
        "11": "3.11.15",
        "12": "3.12",
        "13": "3.13",
        "14": "3.14",
    }

    return version_map.get(minor, None)


def get_version_or_default(query: str) -> str:
    version = detect_version(query)
    return version if version else DEFAULT_VERSION