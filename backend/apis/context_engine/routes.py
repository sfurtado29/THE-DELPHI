from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel

from .context_memory import (
    get_context, update_context, reset_context,
    force_update_field, set_pending_edit, get_pending_edit, clear_pending_edit,
)
from .openai_service import ask_gpt

router = APIRouter(prefix="/context", tags=["Context Engine"])


# ── Request models ────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str


class ResetRequest(BaseModel):
    session_id: str


class PrefillRequest(BaseModel):
    session_id: str
    context: dict


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_product(user_input: str) -> str | None:
    """Extract a product or brand name from free-form text."""
    prompt = f"""Extract the product or brand name from this message.
Return ONLY the product or brand name (e.g. "Mac", "Salesforce", "iPhone").
If no product or brand is mentioned, return an empty string.
No explanation.

Message: "{user_input}"
"""
    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=30).strip()
        return result if result else None
    except Exception:
        return None


def _extract_geography(user_input: str) -> str | None:
    try:
        from apis.campaign_suggest.campaign_nlp import extract_geography
        return extract_geography(user_input) or None
    except Exception:
        return None


def _resolve_product_and_geo(session_id: str, user_input: str) -> tuple[str | None, str | None]:
    """
    Resolve product and geography for this session.
    Priority: session context → ICP session → extract from current message.
    """
    ctx = get_context(session_id)["context"]
    product   = ctx.get("product_name") or ctx.get("product") or None
    geography = ctx.get("geography") or None

    # ICP session fallback
    if not product or not geography:
        try:
            from apis.icp_profile.icp_session import get_session as get_icp_session
            icp = get_icp_session(session_id)
            if not product:   product   = icp.get("product") or None
            if not geography: geography = icp.get("geography") or None
        except Exception:
            pass

    # Extract from current message
    if not product:
        product = _extract_product(user_input)
        if product:
            force_update_field(session_id, "product_name", product)

    if not geography:
        geography = _extract_geography(user_input)
        if geography:
            force_update_field(session_id, "geography", geography)

    return product, geography


# ── Chat endpoint ─────────────────────────────────────────────────────────────

@router.post("/chat")
def chat(req: ChatRequest):
    session_id = req.session_id
    user_input = req.message.strip()

    # ── Edit intent: "change geography to India" etc. ────────────────────────
    from .intent_analyzer import detect_edit_intent, extract_new_value_for_field

    pending_field = get_pending_edit(session_id)
    if pending_field:
        new_value = extract_new_value_for_field(user_input, pending_field)
        if new_value:
            force_update_field(session_id, pending_field, new_value)
            clear_pending_edit(session_id)
            product, geography = _resolve_product_and_geo(session_id, "")
            if product and geography:
                return _run_trends(session_id, product, geography)
        return {
            "status":   "in_progress",
            "response": f"What would you like to change it to?",
            "context":  get_context(session_id)["context"],
        }

    edit_field = detect_edit_intent(user_input)
    if edit_field in ("product_name", "geography"):
        from .intent_analyzer import extract_new_value_for_field
        new_value = extract_new_value_for_field(user_input, edit_field)
        if new_value:
            force_update_field(session_id, edit_field, new_value)
            product, geography = _resolve_product_and_geo(session_id, "")
            if product and geography:
                return _run_trends(session_id, product, geography)
        else:
            set_pending_edit(session_id, edit_field)
            label = "product" if edit_field == "product_name" else "geography"
            return {
                "status":   "in_progress",
                "response": f"What would you like to change the {label} to?",
                "context":  get_context(session_id)["context"],
            }

    # ── Resolve product + geography ───────────────────────────────────────────
    product, geography = _resolve_product_and_geo(session_id, user_input)

    if not product:
        return {
            "status":   "in_progress",
            "response": "Which product or brand would you like market insights for?",
            "context":  get_context(session_id)["context"],
        }

    if not geography:
        return {
            "status":   "in_progress",
            "response": f"Which geography are you targeting for **{product}**? (e.g. United States, India, United Kingdom)",
            "context":  get_context(session_id)["context"],
        }

    return _run_trends(session_id, product, geography)


def _run_trends(session_id: str, product: str, geography: str) -> dict:
    ctx = get_context(session_id)["context"]
    try:
        from apis.trends.trends_service import analyze_trends
        narrative = analyze_trends(product, geography)
    except ValueError:
        from apis.trends.trends_service import SUPPORTED_GEOS
        geo_list = ", ".join(SUPPORTED_GEOS[:8])
        narrative = (
            f"I don't have trend data for that geography yet. "
            f"Supported regions include: {geo_list}. Which applies to you?"
        )
    except Exception as e:
        print(f"[ContextChat] Trend error: {e}")
        narrative = "Trend data is temporarily unavailable. Please try again in a moment."

    return {
        "status":   "trend_response",
        "response": narrative,
        "product":  product,
        "geography": geography,
        "context":  ctx,
    }


# ── Utility endpoints ─────────────────────────────────────────────────────────

@router.post("/reset")
def reset(req: ResetRequest):
    reset_context(req.session_id)
    return {"status": "reset", "session_id": req.session_id}


@router.post("/prefill")
def prefill_context(req: PrefillRequest):
    """
    Pre-seeds context with values from a campaign pipeline handoff.
    Only sets fields not already filled.
    """
    state    = get_context(req.session_id)
    existing = state["context"]
    for field, value in req.context.items():
        if value and str(value).strip() and not existing.get(field):
            existing[field] = str(value).strip()
    update_context(req.session_id, existing)
    return {
        "status":  "prefilled",
        "context": get_context(req.session_id)["context"],
    }


@router.get("/context/{session_id}")
def get_session_context(session_id: str):
    state = get_context(session_id)
    return {
        "session_id": session_id,
        "context":    state["context"],
    }
