from typing import Any

CSMS_SCALE = [0, 3, 6, 10]


def snap_to_csms_scale(val: Any) -> int:
    try:
        v = float(val)
    except Exception:
        return 6
    if v < 1.5:
        return 0
    elif v < 4.5:
        return 3
    elif v < 8.0:
        return 6
    else:
        return 10


def determine_ai_status(score: int, threshold: int = 6) -> str:
    return "accept" if score >= threshold else "reject"
