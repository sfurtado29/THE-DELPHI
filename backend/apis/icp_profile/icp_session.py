from __future__ import annotations

STAGE_ASK_PRODUCT   = "ask_product"
STAGE_ASK_GEO       = "ask_geography"
STAGE_ASK_INDUSTRY  = "ask_industry"
STAGE_FETCHING      = "fetching"
STAGE_PROFILE_READY = "profile_ready"

_SESSIONS: dict[str, dict] = {}


def get_session(session_id: str) -> dict:
    if session_id not in _SESSIONS:
        _SESSIONS[session_id] = {
            "stage":     STAGE_ASK_PRODUCT,
            "product":   None,
            "geography": None,
            "industry":  None,
            "icp_data":  [],
            "statement": None,
        }
    return _SESSIONS[session_id]


def update_session(session_id: str, updates: dict) -> dict:
    state = get_session(session_id)
    state.update(updates)
    return state


def set_stage(session_id: str, stage: str) -> None:
    get_session(session_id)["stage"] = stage


def reset_session(session_id: str) -> None:
    if session_id in _SESSIONS:
        del _SESSIONS[session_id]
