from __future__ import annotations
import json
import re
from collections import Counter

from apis.context_engine.cortex_service import query_cortex_analyst
from apis.p3_campaign.openai_service import ask_gpt

# Job levels considered decision-makers — exclude staff/associate/intern
_DECISION_MAKER_LEVELS = {
    "c-suite", "c-level", "cxo", "ceo", "cfo", "cto", "cio", "coo",
    "president", "founder", "owner",
    "vp", "vice president",
    "director",
    "senior manager", "manager",
    "head",
}


def fetch_icp_data(geography: str, industry: str) -> list[dict]:
    prompt = (
        f"For engaged leads in campaigns where STANDARD_INDUSTRY_DESC = '{industry}' "
        f"and LOCATION_DESC = '{geography}', "
        f"show the most common JOB_LEVEL_DESC, JOBFUNCTION_DESC, "
        f"EMPLOYEE_SIZE_DESC, REVENUE_SIZE_DESC. "
        f"Group by these columns and order by count descending. Limit 20."
    )
    return query_cortex_analyst(prompt, model="leads")


def _top_values(rows: list[dict], key: str, n: int = 3) -> list[str]:
    counter: Counter = Counter()
    for row in rows:
        val = (row.get(key) or row.get(key.upper()) or row.get(key.lower()) or "").strip()
        if val:
            counter[val] += 1
    return [v for v, _ in counter.most_common(n)]


def _top_decision_makers(rows: list[dict], n: int = 3) -> list[str]:
    """Return top job levels that are actual decision-makers, filtering out staff-level."""
    counter: Counter = Counter()
    for row in rows:
        val = (row.get("JOB_LEVEL_DESC") or row.get("job_level_desc") or "").strip()
        if val and any(dm in val.lower() for dm in _DECISION_MAKER_LEVELS):
            counter[val] += 1
    # Fall back to all levels if none matched the filter
    if not counter:
        return _top_values(rows, "JOB_LEVEL_DESC", n)
    return [v for v, _ in counter.most_common(n)]


def _band_bounds(band: str) -> tuple[float, float]:
    """Extract (low, high) numeric bounds from a band string.
    Handles "100-249", "1000+", "<$25M", "$100M-$249M", "$500M+"."""
    band = band.strip()
    nums = [float(n) for n in re.findall(r"[\d.]+", band)]
    if not nums:
        return (0.0, 0.0)
    if band.startswith("<"):
        return (0.0, nums[0])
    if band.endswith("+"):
        return (nums[0], float("inf"))
    if len(nums) == 1:
        return (nums[0], nums[0])
    return (nums[0], nums[-1])


def _consolidate_range(values: list[str]) -> tuple[str, list[str]]:
    """
    Cluster size/revenue bands around the most frequent one (values[0])
    and return (clean_range, bands_in_cluster).
    e.g. ["100-249", "2500-4999", "250-499"] (frequency order)
         -> ("100–499", ["100-249", "250-499"])
    Bands not adjacent to the dominant one (e.g. "2500-4999") are dropped
    so the stated range and the lead filter stay consistent.
    """
    if not values:
        return "", []
    if len(values) == 1:
        return values[0], values

    bounds = {v: _band_bounds(v) for v in values}
    anchor = values[0]
    sorted_vals = sorted(set(values), key=lambda v: bounds[v][0])
    anchor_idx = sorted_vals.index(anchor)

    cluster = [anchor]
    i = anchor_idx
    while i > 0 and bounds[sorted_vals[i]][0] - bounds[sorted_vals[i - 1]][1] <= 1:
        cluster.append(sorted_vals[i - 1])
        i -= 1
    i = anchor_idx
    while i < len(sorted_vals) - 1 and bounds[sorted_vals[i + 1]][0] - bounds[sorted_vals[i]][1] <= 1:
        cluster.append(sorted_vals[i + 1])
        i += 1

    cluster_sorted = sorted(set(cluster), key=lambda v: bounds[v][0])
    low_band, high_band = cluster_sorted[0], cluster_sorted[-1]

    if low_band.startswith("<"):
        low = low_band
    elif "-" in low_band:
        low = low_band.split("-")[0].strip()
    else:
        low = low_band

    if high_band.endswith("+"):
        high = high_band
    elif "-" in high_band:
        high = high_band.split("-")[-1].strip()
    else:
        high = high_band

    range_str = low if low == high else f"{low}–{high}"
    return range_str, cluster_sorted


def fetch_matching_leads(
    geographies: list[str] | None = None,
    industries: list[str] | None = None,
    employee_sizes: list[str] | None = None,
    job_levels: list[str] | None = None,
    limit: int = 50,
) -> list[dict]:
    conditions = []
    if geographies:
        conditions.append("LOCATION_DESC in (" + ", ".join(f"'{g}'" for g in geographies) + ")")
    if industries:
        conditions.append("STANDARD_INDUSTRY_DESC in (" + ", ".join(f"'{i}'" for i in industries) + ")")
    if employee_sizes:
        conditions.append("EMPLOYEE_SIZE_DESC in (" + ", ".join(f"'{s}'" for s in employee_sizes) + ")")
    if job_levels:
        conditions.append("JOB_LEVEL_DESC in (" + ", ".join(f"'{l}'" for l in job_levels) + ")")

    where_clause = " and ".join(conditions)
    prompt = (
        f"Show leads where {where_clause}. "
        f"Return LEAD_ID, FIRST_NAME, LAST_NAME, COMPANY_NAME, JOB_TITLE, "
        f"JOB_LEVEL_DESC, JOBFUNCTION_DESC, INDUSTRY, LOCATION_DESC, EMPLOYEE_SIZE_DESC. "
        f"Limit {limit}."
    )
    return query_cortex_analyst(prompt, model="leads")


def current_refine_criteria(state: dict) -> dict:
    """
    Derive the active targeting criteria (as multi-value lists) from the
    session's single geography/industry plus the ICP's aggregated employee
    size and decision-maker job levels. Used to pre-select the "Refine
    further" cards and as the "previous" side of the change-confirmation table.
    """
    icp_data = state.get("icp_data", [])

    top_sizes = _top_values(icp_data, "EMPLOYEE_SIZE_DESC", n=3)
    _, size_filter = _consolidate_range(top_sizes)
    job_levels = _top_decision_makers(icp_data, n=3)

    geography = state.get("geography")
    industry  = state.get("industry")

    return {
        "geographies":    [geography] if geography else [],
        "industries":     [industry] if industry else [],
        "employee_sizes": size_filter,
        "job_levels":     job_levels,
    }


def _lead_id(lead: dict) -> int | str | None:
    return lead.get("LEAD_ID") if "LEAD_ID" in lead else lead.get("lead_id")


def refine_leads(leads: list[dict], instruction: str) -> list[dict]:
    """
    Apply a natural-language instruction (e.g. "exclude directors",
    "only show IT industry", "remove Coworx Staffing") to an existing
    leads list and return the filtered list.
    Falls back to the original list if the GPT call/parse fails.
    """
    if not leads or not instruction.strip():
        return leads

    compact = [
        {
            "id":            _lead_id(lead),
            "company":       lead.get("COMPANY_NAME") or lead.get("company_name"),
            "job_title":     lead.get("JOB_TITLE") or lead.get("job_title"),
            "job_level":     lead.get("JOB_LEVEL_DESC") or lead.get("job_level_desc"),
            "job_function":  lead.get("JOBFUNCTION_DESC") or lead.get("jobfunction_desc"),
            "industry":      lead.get("INDUSTRY") or lead.get("industry"),
            "geography":     lead.get("LOCATION_DESC") or lead.get("location_desc"),
            "employee_size": lead.get("EMPLOYEE_SIZE_DESC") or lead.get("employee_size_desc"),
        }
        for lead in leads
    ]

    prompt = f"""You are filtering a list of sales leads based on a user instruction.

Leads (JSON array, each with an "id"):
{json.dumps(compact)}

Instruction: "{instruction}"

Decide which leads to KEEP based on the instruction.
Return ONLY a JSON array of the "id" values to keep, e.g. [101, 205, 309].
If the instruction doesn't relate to any field above, return the ids of ALL leads unchanged.
No explanation, no markdown."""

    response = ask_gpt(prompt, temperature=0.0, max_tokens=1000)
    try:
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        keep_ids = set(json.loads(clean.strip()))
    except Exception as e:
        print(f"[ICP] Refine failed to parse GPT response: {e}")
        return leads

    return [lead for lead in leads if _lead_id(lead) in keep_ids]


def generate_icp_statement(
    geography: str,
    industry:  str,
    product:   str,
    icp_data:  list[dict],
) -> str:
    job_levels     = _top_decision_makers(icp_data, n=3)
    job_functions  = _top_values(icp_data, "JOBFUNCTION_DESC", n=3)
    employee_sizes = _top_values(icp_data, "EMPLOYEE_SIZE_DESC", n=3)
    revenue_sizes  = _top_values(icp_data, "REVENUE_SIZE_DESC", n=3)

    if not any([job_levels, job_functions, employee_sizes, revenue_sizes]):
        return _fallback_statement(geography, industry, product)

    emp_range, _ = _consolidate_range(employee_sizes)
    rev_range, _ = _consolidate_range(revenue_sizes)
    emp_range = emp_range or "mid-to-large"
    rev_range = rev_range or "established"
    levels_str    = ", ".join(job_levels)    or "senior decision-makers"
    functions_str = ", ".join(job_functions) or "key business functions"

    prompt = f"""You are a B2B marketing strategist writing an Ideal Customer Profile (ICP) statement.

Product/Service: {product}
Industry: {industry}
Geography: {geography}
Employee size range: {emp_range}
Revenue range: {rev_range}
Decision-maker levels: {levels_str}
Key departments: {functions_str}

Write EXACTLY 2 paragraphs matching this style:

Paragraph 1 (single sentence):
"Ideal customers are [industry] companies with [employee range] employees, where decision-makers such as [job levels] across [job functions] are actively involved in evaluating solutions that [relevant business challenge for {product}]."

Paragraph 2 (1-2 sentences):
"These organizations are typically seeking [what they want] to [business outcome]."

Rules:
- Employee size: use ONLY the range "{emp_range}" — do NOT list individual bands
- Revenue range: use ONLY the range "{rev_range}" — do NOT list individual ranges
- Job levels: use ONLY these, exactly as given: {levels_str}
- Job functions/departments: use ONLY these, exactly as given: {functions_str}
- Do NOT add filler phrases like "and other departments" or "and other functions" —
  list only the departments/levels named above
- No bullet points, no headers, no emojis
- Professional B2B tone"""

    result = ask_gpt(prompt, temperature=0.4, max_tokens=250)
    return result if result else _fallback_statement(geography, industry, product)


def _fallback_statement(geography: str, industry: str, product: str) -> str:
    return (
        f"Ideal customers are {industry} companies in {geography} with 100–500 employees, "
        f"where decision-makers such as C-suite executives, directors, and senior managers "
        f"across Operations, Finance, and Technology are actively involved in evaluating "
        f"solutions like {product} that improve efficiency and drive business growth.\n\n"
        f"These organizations are typically seeking innovative tools to streamline operations, "
        f"enhance productivity, and achieve better business outcomes."
    )
