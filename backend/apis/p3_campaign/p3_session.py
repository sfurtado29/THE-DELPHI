# p3_campaign/p3_session.py
# ─────────────────────────────────────────────────────────────
# In-memory session store for Pipeline 3.
# Completely separate from context_memory.py (Pipeline 1).
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

# ── Stage constants ───────────────────────────────────────────
STAGE_ASK_PRODUCT           = "ask_product"
STAGE_ASK_GEOGRAPHY         = "ask_geography"
STAGE_ASK_INDUSTRY          = "ask_industry"
STAGE_FETCHING              = "fetching"
STAGE_RECOMMENDATION_READY  = "recommendation_ready"
STAGE_AWAITING_MODIFICATION = "awaiting_modification"   # PATH B2: waiting for mod details
STAGE_AWAITING_CONFIRMATION = "awaiting_confirmation"   # PATH B1/B2: "looks good?"
STAGE_PATH_C_COLLECTING     = "path_c_collecting"       # PATH C: collecting 4 fields
STAGE_COMPLETE              = "complete"

# PATH C field order — only targeting fields, product/geo/industry already known
PATH_C_FIELDS = [
    "job_function",
    "job_level",
    "employee_size",
    "revenue_range",
]

# ── In-memory store ───────────────────────────────────────────
_SESSIONS: dict[str, dict] = {}


# ─────────────────────────────────────────────────────────────
# LIFECYCLE
# ─────────────────────────────────────────────────────────────

def get_session(session_id: str, user_id: int | None = None) -> dict:
    """
    Get or initialise a Pipeline 3 session.
    user_id only used on first creation.
    """
    if session_id not in _SESSIONS:
        _SESSIONS[session_id] = {
            "stage":                   STAGE_ASK_PRODUCT,
            "user_id":                 user_id,

            # Step 6 — product
            "selected_product":      None,

            # Step 7 — targeting questions
            "geography":               None,
            "industry":                None,

            # Background lookup results
            "matched_campaigns":       [],   # raw Cortex rows — never sent to frontend
            "display_campaigns":       [],   # 5 de-identified profiles — sent to frontend

            # Recommendation
            "recommendation":          None,

            # Path B1 — base campaign index while confirming
            "pending_base_index":      None,
            "pending_context":         {},   # built context waiting for user confirmation

            # Path B2 — waiting for modification details
            # (stage = STAGE_AWAITING_MODIFICATION signals this)

            # Path C — accumulates answers to 4 targeting fields
            "path_c_context":          {},

            # Final output
            "final_context":           {},
        }
    return _SESSIONS[session_id]


def update_session(session_id: str, updates: dict) -> dict:
    """Merge updates into session. Returns updated session."""
    state = get_session(session_id)
    state.update(updates)
    return state


def set_stage(session_id: str, stage: str) -> None:
    get_session(session_id)["stage"] = stage


def get_stage(session_id: str) -> str:
    return get_session(session_id).get("stage", STAGE_ASK_PRODUCT)


def reset_session(session_id: str) -> None:
    if session_id in _SESSIONS:
        del _SESSIONS[session_id]


# ─────────────────────────────────────────────────────────────
# PATH C HELPERS
# ─────────────────────────────────────────────────────────────

def get_next_path_c_field(session_id: str) -> str | None:
    """Return the next PATH C field not yet collected."""
    ctx = get_session(session_id).get("path_c_context", {})
    for field in PATH_C_FIELDS:
        if not ctx.get(field):
            return field
    return None


def path_c_complete(session_id: str) -> bool:
    return get_next_path_c_field(session_id) is None


def update_path_c(session_id: str, field: str, value: str) -> None:
    state = get_session(session_id)
    state["path_c_context"][field] = value


# ─────────────────────────────────────────────────────────────
# FINAL CONTEXT BUILDER
# ─────────────────────────────────────────────────────────────

def build_final_context(
    product:       str,
    geography:     str,
    industry:      str,
    targeting:     dict,
) -> dict:
    """
    Assemble the final targeting context returned to frontend.
    targeting dict can have: job_level, job_function,
                             employee_size, revenue_range
    Missing fields left as None — intentionally incomplete is fine.
    """
    return {
        "product":       product,
        "geography":     geography,
        "industry":      industry,
        "job_level":     targeting.get("job_level")     or None,
        "job_function":  targeting.get("job_function")  or None,
        "employee_size": targeting.get("employee_size") or None,
        "revenue_range": targeting.get("revenue_range") or None,
    }