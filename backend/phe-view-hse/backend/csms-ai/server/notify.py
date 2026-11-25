import json
from typing import Any, Dict, Union

# Postgres rejects NOTIFY payloads of 8000 bytes or more ("payload string too long"). Keep a margin.
MAX_PAYLOAD_BYTES = 7900
# Long free-text fields are trimmed to this many characters when the payload is too big.
TRIM_CHARS = 300


def build_payload(payload: Union[str, Dict[str, Any]]) -> str:
    """JSON for csms_ai_evaluation_channel that always fits the NOTIFY limit."""
    data = json.loads(payload) if isinstance(payload, str) else dict(payload)
    text = json.dumps(data, default=str)
    if len(text.encode("utf-8")) <= MAX_PAYLOAD_BYTES:
        return text
    # The UI re-reads full texts (reasoning, messages) from the DB; the event only needs ids and status.
    data.pop("aiReasoning", None)
    data = {k: (v[:TRIM_CHARS] + "...") if isinstance(v, str) and len(v) > TRIM_CHARS else v for k, v in data.items()}
    text = json.dumps(data, default=str)
    if len(text.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        keep = ("folderId", "jobId", "subfolderId", "status", "aiScore", "aiStatus")
        text = json.dumps({k: data[k] for k in keep if k in data}, default=str)
    return text


async def notify(conn, payload: Union[str, Dict[str, Any]]) -> None:
    """Send a realtime event. A failed notification must never fail the evaluation itself."""
    try:
        await conn.execute("SELECT pg_notify('csms_ai_evaluation_channel', $1)", build_payload(payload))
    except Exception as e:
        print(f"[CSMS-AI] Warning: realtime notification skipped: {e}")
