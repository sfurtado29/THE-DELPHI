# campaign_memory.py
# ─────────────────────────────────────────────────────────────
# In-memory session store for the Campaign Suggestion Pipeline.
# Completely separate from context_memory.py.
#
# Pipeline stages:
#   ask_geography    — waiting for geography input
#   ask_industry     — waiting for industry input
#   show_campaigns   — matched campaigns displayed to user
#   await_icp        — asked "explore ICP from past campaigns?"
#   show_icp         — showing ICP details from selected campaign
#   handoff          — transitioning to context/lead pipeline
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

STAGE_ASK_GEO       = "ask_geography"
STAGE_ASK_INDUSTRY  = "ask_industry"
STAGE_SHOW_CAMPAIGNS= "show_campaigns"
STAGE_AWAIT_ICP     = "await_icp"
STAGE_SHOW_ICP      = "show_icp"
STAGE_HANDOFF       = "handoff"

CAMPAIGN_SESSIONS: dict[str, dict] = {}


def _empty_session() -> dict:
    return {
        "brand":             None,
        "geography":         None,
        "industry":          None,
        "stage":             STAGE_ASK_GEO,
        "matched_campaigns": [],
        "selected_campaign": None,
        "icp_data":          None,
    }


def get_campaign_session(session_id: str) -> dict:
    if session_id not in CAMPAIGN_SESSIONS:
        CAMPAIGN_SESSIONS[session_id] = _empty_session()
    return CAMPAIGN_SESSIONS[session_id]


def update_campaign_session(session_id: str, **kwargs) -> dict:
    state = get_campaign_session(session_id)
    for k, v in kwargs.items():
        state[k] = v
    return state


def reset_campaign_session(session_id: str) -> None:
    if session_id in CAMPAIGN_SESSIONS:
        del CAMPAIGN_SESSIONS[session_id]


def is_campaign_pipeline_active(session_id: str) -> bool:
    """
    Returns True if this session is still within the campaign pipeline
    (has not yet reached the handoff stage).
    """
    if session_id not in CAMPAIGN_SESSIONS:
        return False
    return CAMPAIGN_SESSIONS[session_id]["stage"] != STAGE_HANDOFF