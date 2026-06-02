# apis/p3_campaign/p3_campaign_bridge.py
from __future__ import annotations
from fastapi import BackgroundTasks

from apis.campaign_suggest.campaign_nlp         import extract_geography, extract_industry
from apis.campaign_suggest.campaign_suggestions import (
    get_geography_suggestions,
    get_industry_suggestions,
)
from apis.campaign_suggest.campaign_cortex_service import find_similar_campaigns

from apis.p3_campaign.p3_session import (
    get_session,
    update_session,
    set_stage,
    STAGE_ASK_INDUSTRY,
    STAGE_FETCHING,
    STAGE_RECOMMENDATION_READY,
)
from apis.p3_campaign.p3_recommendation import generate_recommendation


def handle_ask_geography(session_id: str, user_input: str) -> dict:
    geography = extract_geography(user_input)

    if not geography:
        return {
            "status":      "in_progress",
            "stage":       "ask_geography",
            "response":    (
                "I didn't catch a specific geography. "
                "Which country or region are you targeting? "
                "For example: USA, Europe, India."
            ),
            "suggestions": {"geography": get_geography_suggestions()},
        }

    update_session(session_id, {"geography": geography})
    set_stage(session_id, STAGE_ASK_INDUSTRY)

    return {
        "status":      "in_progress",
        "stage":       STAGE_ASK_INDUSTRY,
        "response":    f"Targeting {geography}. Which industry are you focusing on?",
        "suggestions": {"industry": get_industry_suggestions()},
    }


def handle_ask_industry(
    session_id:       str,
    user_input:       str,
    background_tasks: BackgroundTasks,
) -> dict:
    industry = extract_industry(user_input)

    if not industry:
        return {
            "status":      "in_progress",
            "stage":       "ask_industry",
            "response":    (
                "Could you be more specific about the industry? "
                "For example: Banking, Technology, Healthcare."
            ),
            "suggestions": {"industry": get_industry_suggestions()},
        }

    state     = get_session(session_id)
    geography = state["geography"]

    update_session(session_id, {"industry": industry})
    set_stage(session_id, STAGE_FETCHING)

    background_tasks.add_task(
        _run_campaign_lookup,
        session_id=session_id,
        geography=geography,
        industry=industry,
        user_id=state.get("user_id"),
    )

    return {
        "status":   "fetching",
        "stage":    STAGE_FETCHING,
        "response": f"Analysing similar campaigns for {industry} in {geography}...",
    }


def _run_campaign_lookup(
    session_id: str,
    geography:  str,
    industry:   str,
    user_id:    int | None,
) -> None:
    matched_campaigns = []
    try:
        matched_campaigns = find_similar_campaigns(
            geography=geography,
            industry=industry,
            limit=5,
        )
        print(f"[P3Bridge] {len(matched_campaigns)} campaigns found for {industry}/{geography}")
    except Exception as e:
        print(f"[P3Bridge] Campaign lookup failed: {e}")

    try:
        state            = get_session(session_id)
        selected_product = state.get("selected_product", "")
        recommendation, display_campaigns = generate_recommendation(
            geography=geography,
            industry=industry,
            selected_product=selected_product,
            matched_campaigns=matched_campaigns,
            company_profile=None,
        )
    except Exception as e:
        print(f"[P3Bridge] Recommendation generation failed: {e}")
        recommendation    = (
            f"For {industry} in {geography}, I recommend targeting "
            f"mid-to-senior level decision makers at relevant companies."
        )
        display_campaigns = _build_display_campaigns(matched_campaigns)

    update_session(session_id, {
        "matched_campaigns": matched_campaigns,
        "display_campaigns": display_campaigns,
        "recommendation":    recommendation,
    })
    set_stage(session_id, STAGE_RECOMMENDATION_READY)
    print(f"[P3Bridge] Session {session_id} → recommendation_ready")


def _build_display_campaigns(matched_campaigns: list[dict]) -> list[dict]:
    def _get(row, *keys):
        for k in keys:
            v = row.get(k) or row.get(k.upper()) or row.get(k.lower())
            if v:
                return str(v).strip()
        return "Not specified"

    display = []
    for i, c in enumerate(matched_campaigns[:5]):
        display.append({
            "index":         i + 1,
            "job_level":     _get(c, "target_job_level"),
            "job_function":  _get(c, "target_job_function"),
            "employee_size": _get(c, "target_employee_size"),
            "revenue_range": _get(c, "target_revenue_size"),
            "geography":     _get(c, "target_geography"),
            "quantity":      _get(c, "effective_total_quantity"),
        })
    return display