import os
import time
import json
import inspect
import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL    = "llama-3.3-70b-versatile"
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

# All calls logged to backend/groq_usage.log (two levels up from this file)
_LOG_FILE = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "groq_usage.log")
)


def _get_caller() -> str:
    """
    Walk the call stack to find the first frame outside this file.
    Auto-tags every ask_gpt() call with the file+function that triggered it —
    no changes needed at any call site.
    e.g. icp_service.py calls ask_gpt() → returns "icp_service.py::generate_icp_statement"
    """
    this_file = os.path.abspath(__file__)
    for frame_info in inspect.stack()[2:]:
        if os.path.abspath(frame_info.filename) != this_file:
            return f"{os.path.basename(frame_info.filename)}::{frame_info.function}"
    return "unknown"


def _log(caller: str, in_tokens: int, out_tokens: int,
         latency: float, success: bool) -> None:
    entry = {
        "ts":        datetime.datetime.now().isoformat(timespec="seconds"),
        "caller":    caller,
        "model":     GROQ_MODEL,
        "in_tokens": in_tokens,
        "out":       out_tokens,
        "total":     in_tokens + out_tokens,
        "latency_s": latency,
        "success":   success,
    }
    try:
        with open(_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def ask_gpt(prompt: str, temperature: float = 0.7, max_tokens: int = 500) -> str:
    """
    Drop-in replacement for openai_service.ask_gpt().
    Same signature — no call sites need changing.
    Calls Groq llama-3.3-70b-versatile and logs every call to backend/groq_usage.log.
    Returns response text, or empty string on failure.
    """
    caller = _get_caller()

    if not GROQ_API_KEY:
        print("[Groq] GROQ_API_KEY not set — returning empty string")
        _log(caller, 0, 0, 0.0, False)
        return ""

    t0 = time.time()
    try:
        resp = requests.post(
            GROQ_ENDPOINT,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       GROQ_MODEL,
                "messages":    [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens":  max_tokens,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data       = resp.json()
        text       = data["choices"][0]["message"]["content"].strip()
        usage      = data.get("usage", {})
        in_tokens  = usage.get("prompt_tokens", 0)
        out_tokens = usage.get("completion_tokens", 0)
        latency    = round(time.time() - t0, 2)
        _log(caller, in_tokens, out_tokens, latency, True)
        return text
    except Exception as e:
        latency = round(time.time() - t0, 2)
        print(f"[Groq Error] {e}")
        _log(caller, 0, 0, latency, False)
        return ""
