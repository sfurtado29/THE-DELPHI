# campaign_cortex_service.py
# ─────────────────────────────────────────────────────────────
# Queries Snowflake Cortex using the CAMPAIGN_SUGGESTION semantic
# model. Underlying view: delphi_db.public.vw_campaign_targeting_context
#
# IMPORTANT: geography and industry values are passed verbatim
# from the user — no normalisation. The DB stores "Banking" not
# "Finance", "Afghanistan" not an abbreviation. Any mapping
# before this point loses data.
# ─────────────────────────────────────────────────────────────

from __future__ import annotations
from ..context_engine.cortex_service import query_cortex_analyst


def find_similar_campaigns(
    geography: str,
    industry: str,
    limit: int = 5,
) -> list[dict]:
    """
    Find past campaigns matching geography + industry.
    Values are passed exactly as received — Cortex handles matching
    against the exact strings stored in vw_campaign_targeting_context.
    """
    prompt = (
        f"Show past campaigns where target_industry is '{industry}' "
        f"and target_geography is '{geography}'. "
        f"Include client_name, campaign_information, campaign_code, "
        f"insertion_order_number, target_employee_size, target_revenue_size, "
        f"and effective_total_quantity. "
        f"Limit {limit}."
    )
    return query_cortex_analyst(prompt, model="campaign")


def get_campaign_icp_details(campaign_code: str) -> list[dict]:
    """
    Fetch ICP targeting breakdown for a specific campaign by campaign_code.
    """
    prompt = (
        f"Show the targeting details for campaign_code '{campaign_code}'. "
        f"Include target_job_function, target_job_level, target_employee_size, "
        f"target_revenue_size, target_geography, and total engaged leads."
    )
    return query_cortex_analyst(prompt, model="campaign")