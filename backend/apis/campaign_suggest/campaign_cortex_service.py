# campaign_cortex_service.py
# ─────────────────────────────────────────────────────────────
# Queries Snowflake Cortex using the CAMPAIGN_DISCOVER semantic
# model (base tables, no view dependency).
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
    brand_category: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """
    Find past campaigns whose engaged leads match geography + industry.
    If brand_category is given, restrict to orders whose brand falls in
    that category (via MST_TBLBRAND -> MST_TBLBRAND_CATEGORY), so campaigns
    for similar brands (e.g. Apple <-> Dell, both "Computers & Hardware")
    are surfaced even when the exact brand never ran a campaign.
    Column names match CAMPAIGN_DISCOVER.yaml base table definitions.
    """
    category_clause = ""
    if brand_category:
        category_clause = (
            f"and the order's brand has a category (via MST_TBLBRAND_CATEGORY.CATEGORY) "
            f"of '{brand_category}' "
        )

    prompt = (
        f"Show campaigns where engaged leads have STANDARD_INDUSTRY_DESC = '{industry}' "
        f"and LOCATION_DESC = '{geography}' {category_clause}. "
        f"Include CAMPAIGN_ID, CAMPAIGN_DESC, INSERTION_ORDER_NUMBER, "
        f"EMPLOYEE_SIZE_DESC, REVENUE_SIZE_DESC, EFFECTIVE_TOTAL_QUANTITY, "
        f"BRAND_NAME, CATEGORY. "
        f"Limit {limit}."
    )
    return query_cortex_analyst(prompt, model="campaign")


def get_campaign_icp_details(campaign_code: str) -> list[dict]:
    """
    Fetch ICP targeting breakdown for a specific campaign by CAMPAIGN_ID.
    """
    prompt = (
        f"For campaign with CAMPAIGN_ID = '{campaign_code}', "
        f"show the targeting details of engaged leads. "
        f"Include JOBFUNCTION_DESC, JOB_LEVEL_DESC, EMPLOYEE_SIZE_DESC, "
        f"REVENUE_SIZE_DESC, LOCATION_DESC, and count of engaged leads."
    )
    return query_cortex_analyst(prompt, model="campaign")