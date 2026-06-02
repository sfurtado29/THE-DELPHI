# apis/p3_campaign/p3_paths.py
from __future__ import annotations
import re
import json
from apis.context_engine.openai_service  import ask_gpt
from apis.context_engine.intent_analyzer import analyze_intent
from apis.context_engine.taxonomy_matcher import match_taxonomy_value

_ACCEPT_KEYWORDS = (
    "go with", "select", "pick", "choose", "option",
    "campaign", "number", "first", "second", "third",
    "fourth", "fifth", "1st", "2nd", "3rd", "4th", "5th",
    "1", "2", "3", "4", "5",
    "that one", "this one", "looks good", "perfect",
    "sounds good", "yes", "yeah", "go ahead",
)
_MODIFY_KEYWORDS = (
    "but", "except", "change", "instead", "modify",
    "adjust", "update", "different", "not exactly",
    "tweak", "however", "although", "modification",
    "modifications", "want changes", "slight change",
)
_REJECT_KEYWORDS = (
    "no", "none", "skip", "reject", "fresh start",
    "start fresh", "start over", "define my own",
    "my own criteria", "something different",
    "not interested", "don't like", "don't want",
    "nope", "neither",
)
_ORDINALS = {
    "first": 0, "1st": 0, "one": 0, "1": 0,
    "second": 1, "2nd": 1, "two": 1, "2": 1,
    "third": 2, "3rd": 2, "three": 2, "3": 2,
    "fourth": 3, "4th": 3, "four": 3, "4": 3,
    "fifth": 4, "5th": 4, "five": 4, "5": 4,
}


def detect_path(user_input: str, display_campaigns: list[dict]) -> str:
    lower       = user_input.lower()
    has_reject  = any(kw in lower for kw in _REJECT_KEYWORDS)
    has_modify  = any(kw in lower for kw in _MODIFY_KEYWORDS)
    has_accept  = any(kw in lower for kw in _ACCEPT_KEYWORDS)
    has_ordinal = bool(re.search(
        r'\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|[1-5])\b', lower
    ))

    if has_reject and not has_accept and not has_ordinal:
        return "reject"
    if (has_ordinal or has_accept) and has_modify:
        return "modify_campaign"
    if has_ordinal or (has_accept and not has_modify):
        return "accept"
    if has_modify and not has_ordinal:
        return "modify_free"

    return _gpt_detect_path(user_input, display_campaigns)


def _gpt_detect_path(user_input: str, display_campaigns: list[dict]) -> str:
    n = len(display_campaigns)
    prompt = f"""A user was shown {n} de-identified B2B campaign targeting profiles
and a targeting recommendation. They responded:

"{user_input}"

Classify their response as EXACTLY ONE of:
- "accept"          — selected a specific campaign (1–{n}), no changes
- "modify_campaign" — selected a campaign AND wants to change something
- "modify_free"     — wants modifications but didn't pick a specific campaign
- "reject"          — declined all, wants to define their own criteria

Return ONLY the classification string. No explanation."""

    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=20).strip().lower().strip('"')
        if result in ("accept", "modify_campaign", "modify_free", "reject"):
            return result
    except Exception as e:
        print(f"[P3Paths] GPT path detection error: {e}")
    return "modify_free"


def detect_campaign_selection(user_input: str, display_campaigns: list[dict]) -> int | None:
    lower = user_input.lower()
    n     = len(display_campaigns)

    for word, idx in _ORDINALS.items():
        if re.search(r'\b' + re.escape(word) + r'\b', lower):
            if idx < n:
                return idx

    for i, c in enumerate(display_campaigns):
        for field in ("job_level", "job_function", "employee_size", "revenue_range"):
            val = (c.get(field) or "").lower()
            if val and val != "not specified" and val in lower:
                return i

    numbered = "\n".join(
        f"{c['index']}. {c['job_level']} {c['job_function']} | "
        f"{c['employee_size']} | {c['revenue_range']}"
        for c in display_campaigns
    )
    prompt = f"""A user was shown these campaign profiles:

{numbered}

User said: "{user_input}"

Which campaign number (1–{n}) are they referring to?
Return ONLY the number (1–{n}), or NONE if unclear. No explanation."""

    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=10).strip()
        if result.isdigit():
            idx = int(result) - 1
            if 0 <= idx < n:
                return idx
    except Exception as e:
        print(f"[P3Paths] GPT campaign selection error: {e}")
    return None


def extract_modifications(user_input: str) -> dict:
    extracted = {}
    try:
        intent_data   = analyze_intent(user_input, current_phase="targeting")
        taxonomy_data = match_taxonomy_value(user_input)
        extracted     = {**intent_data, **taxonomy_data}
    except Exception as e:
        print(f"[P3Paths] Extractor error: {e}")

    targeting_fields = {"job_level", "job_function", "employee_size", "revenue_range"}
    extracted = {k: v for k, v in extracted.items() if k in targeting_fields and v}

    if extracted:
        return extracted

    # GPT fallback
    prompt = f"""You are a data extraction engine for a B2B campaign tool.

Extract ONLY values explicitly stated in the user input for these fields:
- job_level     (e.g. C-Suite, VP, Director, Manager)
- job_function  (e.g. Finance, Marketing, Engineering, Operations)
- employee_size (e.g. Mid-size, Enterprise, Small business)
- revenue_range (e.g. $50M–$500M, >$1B, Mid-market)

User input: "{user_input}"

Return ONLY valid JSON. Empty string for fields not mentioned. No markdown.
{{"job_level":"","job_function":"","employee_size":"","revenue_range":""}}"""

    try:
        response = ask_gpt(prompt, temperature=0.0, max_tokens=150).strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
        data = json.loads(response.strip())
        return {k: v for k, v in data.items() if v and str(v).strip()}
    except Exception as e:
        print(f"[P3Paths] GPT extraction error: {e}")
        return {}


def build_targeting_from_campaign(campaign: dict) -> dict:
    return {
        "job_level":     campaign.get("job_level")     or None,
        "job_function":  campaign.get("job_function")  or None,
        "employee_size": campaign.get("employee_size") or None,
        "revenue_range": campaign.get("revenue_range") or None,
    }


def apply_overrides(base: dict, overrides: dict) -> dict:
    result = {**base}
    for k, v in overrides.items():
        if v and str(v).strip():
            result[k] = v
    return result


def format_targeting_summary(
    product: str, geography: str, industry: str, targeting: dict
) -> str:
    lines = [
        f"Product:       {product}",
        f"Geography:     {geography}",
        f"Industry:      {industry}",
        f"Job Level:     {targeting.get('job_level')     or 'Not specified'}",
        f"Job Function:  {targeting.get('job_function')  or 'Not specified'}",
        f"Company Size:  {targeting.get('employee_size') or 'Not specified'}",
        f"Revenue Range: {targeting.get('revenue_range') or 'Not specified'}",
    ]
    return "\n".join(lines)