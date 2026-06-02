# apis/p3_campaign/p3_recommendation.py
from __future__ import annotations
import json
from apis.context_engine.openai_service import ask_gpt


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


def _generate_recommendation_text(
    geography:         str,
    industry:          str,
    selected_product:  str,
    display_campaigns: list[dict],
    company_profile:   dict | None,
) -> str:
    if display_campaigns:
        prompt = f"""You are a senior B2B campaign strategist at Delphi AI.

A user wants to run a campaign for their product: "{selected_product}"
Target geography: {geography}
Target industry:  {industry}

Based on the following similar past campaign targeting profiles
(de-identified), write a short targeting recommendation:

{json.dumps(display_campaigns, indent=2)}

Rules:
- Write 2–3 sentences maximum.
- Sound like a sharp consultant giving a specific recommendation.
- Do NOT mention campaign names, codes, client names, or numbers of campaigns.
- Do NOT say "based on X campaigns" or "based on past data".
- Do NOT use filler phrases like "Great!" or "Certainly!".
- Mention specific job levels, functions, company sizes, or revenue
  ranges that appear consistently across the profiles."""
    else:
        prompt = f"""You are a senior B2B campaign strategist at Delphi AI.

A user wants to run a campaign for their product: "{selected_product}"
Target geography: {geography}
Target industry:  {industry}

No direct historical campaign data is available for this combination.
Write a short, confident targeting recommendation based on general
B2B best practices for this industry and geography.

Rules:
- Write 2–3 sentences maximum.
- Do NOT say "I don't have data" or "no campaigns found".
- Do NOT use filler phrases.
- Be specific about job levels, functions, or company sizes typical for this industry."""

    try:
        return ask_gpt(prompt, temperature=0.6, max_tokens=180)
    except Exception as e:
        print(f"[P3Recommendation] GPT error: {e}")
        return (
            f"For {industry} in {geography}, I recommend targeting "
            f"mid-to-senior decision makers at relevant companies. "
            f"Here are some targeting profiles that match your criteria."
        )


def generate_recommendation(
    geography:         str,
    industry:          str,
    selected_product:  str,
    matched_campaigns: list[dict],
    company_profile:   dict | None = None,   # future: peer lookup
) -> tuple[str, list[dict]]:
    display_campaigns    = _build_display_campaigns(matched_campaigns)
    recommendation_text  = _generate_recommendation_text(
        geography=geography,
        industry=industry,
        selected_product=selected_product,
        display_campaigns=display_campaigns,
        company_profile=company_profile,
    )
    return recommendation_text, display_campaigns