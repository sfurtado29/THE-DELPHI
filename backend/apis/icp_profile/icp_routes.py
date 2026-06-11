from __future__ import annotations
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from db import get_conn
from apis.campaign_suggest.campaign_nlp import extract_geography, extract_industry
from apis.icp_profile.icp_session import (
    get_session, update_session, set_stage, reset_session,
    STAGE_ASK_PRODUCT, STAGE_ASK_GEO, STAGE_ASK_INDUSTRY,
    STAGE_FETCHING, STAGE_PROFILE_READY,
)
from apis.icp_profile.icp_service import fetch_icp_data, fetch_matching_leads, generate_icp_statement, refine_leads, _top_values, _top_decision_makers, _consolidate_range

router = APIRouter(prefix="/icp", tags=["ICP Profile"])

_TRIGGER_PHRASES = [
    "create icp", "icp profile", "build icp", "generate icp",
    "ideal customer", "create an icp", "build an icp",
]


class ICPRequest(BaseModel):
    session_id: str
    user_id:    int
    message:    str


def _is_trigger(text: str) -> bool:
    return any(phrase in text.lower() for phrase in _TRIGGER_PHRASES)


def _get_user_products(user_id: int) -> list[str]:
    """
    Fetch saved brands or services from delphi_company_profiles for this user.
    Returns a list of product/service name strings.
    """
    try:
        conn   = get_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT brands, services FROM delphi_company_profiles "
            "WHERE user_id = %s ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if not row:
            return []

        raw = row.get("brands") or row.get("services") or ""
        products = [p.strip() for p in raw.split(",") if p.strip()]
        return products

    except Exception as e:
        print(f"[ICP] Failed to fetch products for user {user_id}: {e}")
        return []

    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


def _run_icp_lookup(
    session_id: str,
    geography:  str,
    industry:   str,
    product:    str,
) -> None:
    try:
        icp_data  = fetch_icp_data(geography, industry)
        statement = generate_icp_statement(geography, industry, product, icp_data)
    except Exception as e:
        print(f"[ICP] Lookup failed: {e}")
        icp_data  = []
        statement = (
            f"Ideal customers are {industry} companies in {geography} with a "
            f"mid-to-large employee base, where senior decision-makers are evaluating "
            f"solutions like {product} to drive growth and operational efficiency."
        )

    update_session(session_id, {"icp_data": icp_data, "statement": statement})
    set_stage(session_id, STAGE_PROFILE_READY)
    print(f"[ICP] Session {session_id} → profile_ready")


@router.post("/chat")
def icp_chat(req: ICPRequest, background_tasks: BackgroundTasks):
    session_id = req.session_id
    message    = req.message.strip()

    # Reset and restart on trigger phrase
    if _is_trigger(message):
        reset_session(session_id)

    state = get_session(session_id)
    stage = state["stage"]

    # ── STAGE: ASK_PRODUCT ───────────────────────────────────
    if stage == STAGE_ASK_PRODUCT:
        products = _get_user_products(req.user_id)

        # If trigger phrase detected, just show product options
        if _is_trigger(message):
            return {
                "status":        "in_progress",
                "stage":         STAGE_ASK_PRODUCT,
                "response":      "Which product or service is this ICP for?",
                "products":      products,
                "allow_custom":  True,
            }

        # Otherwise treat message as product selection
        selected = message.strip()
        if not selected:
            return {
                "status":       "in_progress",
                "stage":        STAGE_ASK_PRODUCT,
                "response":     "Please select a product or type a new one.",
                "products":     products,
                "allow_custom": True,
            }

        update_session(session_id, {"product": selected})
        set_stage(session_id, STAGE_ASK_GEO)
        return {
            "status":   "in_progress",
            "stage":    STAGE_ASK_GEO,
            "response": f"Got it — building ICP for {selected}. Which geography are you targeting? (e.g. USA, India, Europe)",
        }

    # ── STAGE: ASK_GEO ───────────────────────────────────────
    if stage == STAGE_ASK_GEO:
        geography = extract_geography(message)
        if not geography:
            return {
                "status":   "in_progress",
                "stage":    STAGE_ASK_GEO,
                "response": "Which geography are you targeting? (e.g. USA, India, Europe)",
            }

        update_session(session_id, {"geography": geography})
        set_stage(session_id, STAGE_ASK_INDUSTRY)
        return {
            "status":   "in_progress",
            "stage":    STAGE_ASK_INDUSTRY,
            "response": f"Targeting {geography}. Which industry are you focused on? (e.g. Banking, Technology, Healthcare)",
        }

    # ── STAGE: ASK_INDUSTRY ──────────────────────────────────
    if stage == STAGE_ASK_INDUSTRY:
        industry = extract_industry(message)
        if not industry:
            return {
                "status":   "in_progress",
                "stage":    STAGE_ASK_INDUSTRY,
                "response": "Which industry are you targeting? (e.g. Banking, Technology, Healthcare)",
            }

        geography = state["geography"]
        product   = state["product"]
        update_session(session_id, {"industry": industry})
        set_stage(session_id, STAGE_FETCHING)

        background_tasks.add_task(_run_icp_lookup, session_id, geography, industry, product)

        return {
            "status":   "fetching",
            "stage":    STAGE_FETCHING,
            "response": f"Building ICP for {product} in {industry}, {geography}. This will take a moment...",
        }

    # ── STAGE: FETCHING ──────────────────────────────────────
    if stage == STAGE_FETCHING:
        return {
            "status":   "fetching",
            "stage":    STAGE_FETCHING,
            "response": "Still building your ICP profile, please wait a moment...",
        }

    # ── STAGE: PROFILE_READY ─────────────────────────────────
    if stage == STAGE_PROFILE_READY:
        return {
            "status":    "complete",
            "stage":     STAGE_PROFILE_READY,
            "product":   state["product"],
            "geography": state["geography"],
            "industry":  state["industry"],
            "statement": state["statement"],
            "response":  state["statement"],
        }

    # Fallback — reset to start
    reset_session(session_id)
    products = _get_user_products(req.user_id)
    return {
        "status":       "in_progress",
        "stage":        STAGE_ASK_PRODUCT,
        "response":     "Which product or service is this ICP for?",
        "products":     products,
        "allow_custom": True,
    }


class ICPAcceptRequest(BaseModel):
    session_id: str


@router.post("/accept")
def accept_icp(req: ICPAcceptRequest):
    """
    Called when the user clicks 'Accept ICP'.
    Fetches individual leads matching the accepted ICP criteria.
    """
    state = get_session(req.session_id)

    if state["stage"] != STAGE_PROFILE_READY:
        return {"error": "No ICP profile ready for this session."}

    geography = state.get("geography")
    industry  = state.get("industry")
    icp_data  = state.get("icp_data", [])

    if not geography or not industry:
        return {"error": "Session missing geography or industry."}

    # Derive the employee size bands from the ICP aggregation, keeping the
    # lead filter consistent with the consolidated range shown in the statement
    top_sizes = _top_values(icp_data, "EMPLOYEE_SIZE_DESC", n=3)
    emp_range, size_filter = _consolidate_range(top_sizes)

    # Restrict leads to decision-maker levels
    job_levels = _top_decision_makers(icp_data, n=3)

    try:
        leads = fetch_matching_leads(
            geography, industry,
            employee_sizes=size_filter,
            job_levels=job_levels,
            limit=50,
        )
    except Exception as e:
        print(f"[ICP] Accept leads fetch failed: {e}")
        leads = []

    update_session(req.session_id, {"leads": leads})

    return {
        "status":      "accepted",
        "product":     state["product"],
        "geography":   geography,
        "industry":    industry,
        "statement":   state["statement"],
        "emp_range":   emp_range,
        "leads":       leads,
        "lead_count":  len(leads),
    }


class ICPRefineRequest(BaseModel):
    session_id: str
    message:    str


@router.post("/refine")
def refine_icp_leads(req: ICPRefineRequest):
    """
    Apply a natural-language instruction (e.g. "exclude directors") to the
    leads list returned by /accept. Filters in place — each call refines
    the result of the previous one.
    """
    state = get_session(req.session_id)
    leads = state.get("leads")

    if leads is None:
        return {"error": "No leads available yet. Accept the ICP first."}

    instruction = req.message.strip()
    if not instruction:
        return {"error": "No instruction provided."}

    try:
        refined = refine_leads(leads, instruction)
    except Exception as e:
        print(f"[ICP] Refine failed: {e}")
        return {"error": "Failed to apply that instruction."}

    update_session(req.session_id, {"leads": refined})

    return {
        "status":      "refined",
        "instruction": instruction,
        "leads":       refined,
        "lead_count":  len(refined),
    }
