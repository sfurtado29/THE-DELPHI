# campaign_routes.py
# ─────────────────────────────────────────────────────────────
# Campaign Suggestion Pipeline — FastAPI router.
#
# Pipeline flow:
#   /campaign/start
#     User selects product → stage: ask_geography
#
#   /campaign/chat
#     ask_geography  → user gives geo  → ask_industry
#     ask_industry   → user gives industry → query Cortex
#       If campaigns found:
#         show_campaigns → user reviews list → await_icp
#         await_icp → yes → show_icp (ICP table displayed)
#         await_icp → no  → handoff (context pipeline starts)
#       If no campaigns found:
#         → handoff immediately (context pipeline starts)
#
# The context pipeline (routes.py /context/chat) runs independently.
# On handoff, geography + industry are pre-seeded via /context/prefill.
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from .campaign_memory import (
    get_campaign_session,
    update_campaign_session,
    reset_campaign_session,
    is_campaign_pipeline_active,
    STAGE_ASK_GEO,
    STAGE_ASK_INDUSTRY,
    STAGE_SHOW_CAMPAIGNS,
    STAGE_AWAIT_ICP,
    STAGE_SHOW_ICP,
    STAGE_HANDOFF,
)
from .campaign_cortex_service import (
    find_similar_campaigns,
    get_campaign_icp_details,
)
from .brand_category_service import categorize_brand, UNCATEGORIZED
from .campaign_profile import get_user_products
from .campaign_suggestions import get_geography_suggestions, get_industry_suggestions
from .campaign_nlp import (
    extract_geography,
    extract_industry,
    detect_yes_no,
    generate_geo_question,
    generate_industry_question,
    generate_campaign_found_message,
    generate_icp_interest_question,
    generate_no_campaigns_message,
    generate_icp_narrative,
    generate_handoff_to_context_message,
)

router = APIRouter(prefix="/campaign", tags=["Campaign Suggestion"])


# ══════════════════════════════════════════════════════════════
# REQUEST MODELS
# ══════════════════════════════════════════════════════════════

class StartRequest(BaseModel):
    session_id: str
    brand: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ResetRequest(BaseModel):
    session_id: str


class ProfileRequest(BaseModel):
    user_id: int


# ══════════════════════════════════════════════════════════════
# PROFILE — load client's brands / services from DB
# ══════════════════════════════════════════════════════════════

@router.post("/profile")
def get_campaign_profile(req: ProfileRequest):
    """
    Called when Intelligence.js mounts.
    Returns the client's brands, services, and specialties from
    delphi_company_profiles so the UI can render the product selector.
    """
    data = get_user_products(req.user_id)

    if not data["found"]:
        return {
            "success":      False,
            "message":      "No company profile found. Please complete company enrichment first.",
            "company_name": None,
            "company_type": None,
            "brands":       [],
            "services":     [],
            "specialties":  [],
            "all_products": [],
        }

    all_products = (
        [{"label": b, "type": "brand"}   for b in data["brands"]]
        + [{"label": s, "type": "service"} for s in data["services"]]
    )

    return {
        "success":      True,
        "company_name": data["company_name"],
        "company_type": data["company_type"],
        "brands":       data["brands"],
        "services":     data["services"],
        "specialties":  data["specialties"],
        "all_products": all_products,
    }


# ══════════════════════════════════════════════════════════════
# START — user selected a product/brand
# ══════════════════════════════════════════════════════════════

@router.post("/start")
def start_campaign_pipeline(req: StartRequest):
    """
    Called when the user selects a product from the selector.
    Initialises the campaign session and asks the first question (geography).
    """
    reset_campaign_session(req.session_id)
    update_campaign_session(
        req.session_id,
        brand=req.brand.strip(),
        stage=STAGE_ASK_GEO,
    )

    question = generate_geo_question(req.brand.strip())
    geo_suggestions = ["United States", "United Arab Emirates", "India", "Canada", "Germany","Australia", "France", "Japan", "South Africa"]

    return {
        "status":      "in_progress",
        "stage":       STAGE_ASK_GEO,
        "brand":       req.brand.strip(),
        "response":    question,
        "suggestions": {"geography": geo_suggestions},
    }

# ══════════════════════════════════════════════════════════════
# CHAT — all conversational turns in the campaign pipeline
# ══════════════════════════════════════════════════════════════

@router.post("/chat")
def campaign_chat(req: ChatRequest):
    session_id = req.session_id
    user_input = req.message.strip()

    state = get_campaign_session(session_id)
    stage = state["stage"]

    print(f"[CampaignPipeline] session={session_id} stage={stage} input={user_input!r}")

    if stage == STAGE_ASK_GEO:
        return _handle_ask_geo(session_id, state, user_input)

    if stage == STAGE_ASK_INDUSTRY:
        return _handle_ask_industry(session_id, state, user_input)

    if stage == STAGE_SHOW_CAMPAIGNS:
        return _handle_show_campaigns(session_id, state, user_input)

    if stage == STAGE_AWAIT_ICP:
        return _handle_await_icp(session_id, state, user_input)

    if stage == STAGE_SHOW_ICP:
        return _handle_post_icp(session_id, state, user_input)

    if stage == STAGE_HANDOFF:
        return {
            "status":  "handoff",
            "stage":   STAGE_HANDOFF,
            "response": "Transitioning to the lead search pipeline.",
            "context": _build_handoff_context(state),
        }

    return {"status": "error", "response": "Unknown pipeline stage."}


# ══════════════════════════════════════════════════════════════
# STAGE HANDLERS
# ══════════════════════════════════════════════════════════════

def _handle_ask_geo(session_id: str, state: dict, user_input: str) -> dict:
    geo = extract_geography(user_input)

    if not geo:
        return {
            "status":    "in_progress",
            "stage":     STAGE_ASK_GEO,
            "response":  (
                "Please specify a geography — a country or region would work. "
                "For example: USA, India, Europe, or Australia."
            ),
            "suggestions": {"geography": get_geography_suggestions()},
        }

    update_campaign_session(session_id, geography=geo, stage=STAGE_ASK_INDUSTRY)

    question = generate_industry_question(brand=state["brand"], geography=geo)

    return {
        "status":      "in_progress",
        "stage":       STAGE_ASK_INDUSTRY,
        "geography":   geo,
        "response":    question,
        "suggestions": {"industry": get_industry_suggestions()},
    }


def _handle_ask_industry(session_id: str, state: dict, user_input: str) -> dict:
    industry = extract_industry(user_input)

    if not industry:
        return {
            "status":    "in_progress",
            "stage":     STAGE_ASK_INDUSTRY,
            "response":  (
                "Please specify an industry. "
                "For example: Technology, Healthcare, Finance, or Manufacturing."
            ),
            "suggestions": {"industry": get_industry_suggestions()},
        }

    update_campaign_session(session_id, industry=industry)

    # Categorize the user's selected product/brand so we can also surface
    # campaigns run for OTHER brands in the same B2B category.
    brand_category = categorize_brand(state["brand"])
    if brand_category == UNCATEGORIZED:
        brand_category = None

    # Query Cortex for matching past campaigns
    campaigns = find_similar_campaigns(
        geography=state["geography"],
        industry=industry,
        brand_category=brand_category,
        limit=5,
    )

    if not campaigns:
        # No campaigns found — transition directly to context pipeline
        update_campaign_session(session_id, stage=STAGE_HANDOFF, industry=industry)

        message = generate_no_campaigns_message(
            brand=state["brand"],
            geography=state["geography"],
            industry=industry,
        )

        return {
            "status":    "no_results",
            "stage":     STAGE_HANDOFF,
            "response":  message,
            "campaigns": [],
            "context":   _build_handoff_context({**state, "industry": industry}),
        }

    # Campaigns found — format and present them
    formatted = _format_campaigns(campaigns)
    update_campaign_session(
        session_id,
        industry=industry,
        matched_campaigns=campaigns,
        stage=STAGE_SHOW_CAMPAIGNS,
    )

    message = generate_campaign_found_message(
        brand=state["brand"],
        geography=state["geography"],
        industry=industry,
        campaign_count=len(campaigns),
        campaign_names=[c.get("campaign_name", "") for c in formatted],
    )

    return {
        "status":    "in_progress",
        "stage":     STAGE_SHOW_CAMPAIGNS,
        "response":  message,
        "campaigns": formatted,
    }


def _handle_show_campaigns(session_id: str, state: dict, user_input: str) -> dict:
    """
    User has viewed the campaign list. Any message here means they are ready
    to proceed. We pick the most relevant campaign and ask about ICP interest.
    """
    campaigns = state.get("matched_campaigns", [])
    if not campaigns:
        update_campaign_session(session_id, stage=STAGE_HANDOFF)
        return {
            "status":  "handoff",
            "stage":   STAGE_HANDOFF,
            "response": "No campaigns available. Proceeding to the lead search pipeline.",
            "context": _build_handoff_context(state),
        }

    # Try to select a specific campaign from user input, fall back to first
    selected_raw = _pick_campaign(user_input, campaigns) or campaigns[0]
    selected     = _format_campaigns([selected_raw])[0]

    update_campaign_session(
        session_id,
        selected_campaign=selected_raw,
        stage=STAGE_AWAIT_ICP,
    )

    icp_question = generate_icp_interest_question(campaign=selected)

    return {
        "status":            "in_progress",
        "stage":             STAGE_AWAIT_ICP,
        "response":          icp_question,
        "selected_campaign": selected,
        "quick_replies":     ["Yes, explore the ICP", "No, define my own criteria"],
    }


def _handle_await_icp(session_id: str, state: dict, user_input: str) -> dict:
    """
    User replied YES or NO to the ICP exploration question.

    YES → fetch ICP targeting data and display it (show_icp stage).
          Context pipeline does NOT run — the campaign ICP is used directly.

    NO  → handoff to context pipeline so user can define their own targeting.
    """
    answer = detect_yes_no(user_input)

    if answer == "yes":
        selected = state.get("selected_campaign") or {}
        # selected is already a formatted dict — use campaign_code
        campaign_code = selected.get("campaign_code") or ""

        icp_rows = []
        if campaign_code:
            icp_rows = get_campaign_icp_details(campaign_code)

        update_campaign_session(
            session_id,
            stage=STAGE_SHOW_ICP,
            icp_data=icp_rows,
        )

        formatted_selected = _format_campaigns([selected])[0] if selected else {}
        narrative = generate_icp_narrative(
            campaign=formatted_selected,
            icp_rows=icp_rows,
        )

        # Build the ICP display table from available fields
        icp_display = _build_icp_display(selected, icp_rows)

        return {
            "status":            "in_progress",
            "stage":             STAGE_SHOW_ICP,
            "response":          narrative,
            "icp_table":         icp_display,
            "icp_rows":          icp_rows,
            "selected_campaign": formatted_selected,
            "quick_replies":     ["Use this profile for my campaign", "Define my own criteria"],
        }

    elif answer == "no":
        # User wants their own criteria — hand off to context pipeline
        update_campaign_session(session_id, stage=STAGE_HANDOFF)

        message = generate_handoff_to_context_message(
            brand=state.get("brand", "your product"),
            geography=state.get("geography", ""),
            industry=state.get("industry", ""),
        )

        return {
            "status":  "handoff",
            "stage":   STAGE_HANDOFF,
            "response": message,
            "context": _build_handoff_context(state),
        }

    else:
        return {
            "status":      "in_progress",
            "stage":       STAGE_AWAIT_ICP,
            "response":    "Would you like to explore the Ideal Customer Profile from this campaign? (Yes / No)",
            "quick_replies": ["Yes, explore the ICP", "No, define my own criteria"],
        }


def _handle_post_icp(session_id: str, state: dict, user_input: str) -> dict:
    """
    User has seen the ICP table. They can either accept this profile
    or move to the context pipeline for custom targeting.
    """
    lower = user_input.lower()

    # User wants to use the campaign ICP profile
    if any(kw in lower for kw in ("use this", "use the", "apply", "proceed", "confirm", "accept")):
        update_campaign_session(session_id, stage=STAGE_HANDOFF)
        return {
            "status":  "icp_accepted",
            "stage":   STAGE_HANDOFF,
            "response": (
                "The campaign ICP profile has been applied to your search. "
                "You may now proceed with lead generation based on these targeting criteria."
            ),
            "icp_data": state.get("icp_data", []),
            "context":  _build_handoff_context(state),
        }

    # User wants to define their own — hand off to context pipeline
    update_campaign_session(session_id, stage=STAGE_HANDOFF)

    message = generate_handoff_to_context_message(
        brand=state.get("brand", "your product"),
        geography=state.get("geography", ""),
        industry=state.get("industry", ""),
    )

    return {
        "status":  "handoff",
        "stage":   STAGE_HANDOFF,
        "response": message,
        "context": _build_handoff_context(state),
    }


# ══════════════════════════════════════════════════════════════
# RESET
# ══════════════════════════════════════════════════════════════

@router.post("/reset")
def reset_campaign(req: ResetRequest):
    reset_campaign_session(req.session_id)
    return {"status": "reset", "session_id": req.session_id}


# ══════════════════════════════════════════════════════════════
# DEBUG
# ══════════════════════════════════════════════════════════════

@router.get("/session/{session_id}")
def get_session_debug(session_id: str):
    return get_campaign_session(session_id)


# ══════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════

def _build_handoff_context(state: dict) -> dict:
    """
    Build context dict to pre-seed the lead pipeline.
    Only geography and industry are passed — these are the two fields
    the campaign pipeline collected.
    """
    ctx = {}
    if state.get("geography"):
        ctx["geography"] = state["geography"]
    if state.get("industry"):
        ctx["industry"] = state["industry"]
    return ctx


def _format_campaigns(campaigns: list[dict]) -> list[dict]:
    """
    Normalise Cortex campaign rows for the frontend.
    Column names match CAMPAIGN_DISCOVER.yaml base table definitions.
    """
    out = []
    for c in campaigns:
        row = {k.lower(): v for k, v in c.items()}

        out.append({
            "campaign_code":          row.get("campaign_id") or "",
            "campaign_name":          row.get("campaign_desc") or "Unnamed Campaign",
            "client_name":            "",
            "insertion_order_number": row.get("insertion_order_number") or "",
            "target_employee_size":   row.get("employee_size_desc") or "",
            "target_revenue_size":    row.get("revenue_size_desc") or "",
            "total_quantity":         row.get("effective_total_quantity") or "",
        })
    return out


def _build_icp_display(campaign: dict, icp_rows: list[dict]) -> list[dict]:
    """
    Construct an ICP summary table for frontend display.
    campaign is already a formatted dict (output of _format_campaigns).
    icp_rows come directly from Cortex with lowercase snake_case keys.
    """
    display = []

    # From the formatted campaign header (already normalised keys)
    if campaign.get("target_employee_size"):
        display.append({
            "Attribute": "Target Company Size",
            "Value":     campaign["target_employee_size"],
        })
    if campaign.get("target_revenue_size"):
        display.append({
            "Attribute": "Target Revenue Range",
            "Value":     campaign["target_revenue_size"],
        })

    # From Cortex ICP detail rows
    seen_labels: set = {d["Attribute"] for d in display}
    for row in icp_rows:
        for key, value in row.items():
            if not value:
                continue
            label = key.lower().replace("_", " ").title()
            if label not in seen_labels:
                display.append({"Attribute": label, "Value": str(value)})
                seen_labels.add(label)

    return display


def _pick_campaign(user_input: str, campaigns: list[dict]) -> dict | None:
    """Select a campaign from user input by ordinal or name substring."""
    lower = user_input.lower()

    ordinals = {
        "first": 0, "1st": 0,
        "second": 1, "2nd": 1,
        "third": 2, "3rd": 2,
        "fourth": 3, "4th": 3,
    }
    for word, idx in ordinals.items():
        if word in lower and idx < len(campaigns):
            return campaigns[idx]

    import re
    m = re.search(r'\b(\d)\b', user_input)
    if m:
        idx = int(m.group(1)) - 1
        if 0 <= idx < len(campaigns):
            return campaigns[idx]

    for c in campaigns:
        # campaigns list contains raw Cortex rows (before _format_campaigns)
        raw = {k.lower(): v for k, v in c.items()}
        name   = (raw.get("campaign_desc") or "").lower()
        code   = (raw.get("campaign_id") or "").lower()
        if name and name in lower:
            return c
        if client and client in lower:
            return c

    return None