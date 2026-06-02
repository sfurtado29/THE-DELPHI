# campaign_nlp.py
# ─────────────────────────────────────────────────────────────
# NLP helpers for the Campaign Suggestion Pipeline.
# All GPT prompts are written for professional B2B tone.
# No emojis. No filler phrases.
# ─────────────────────────────────────────────────────────────

from __future__ import annotations
import re
import json
from ..context_engine.openai_service import ask_gpt


# ── Geography alias map ───────────────────────────────────────
_GEO_ALIASES: dict[str, str] = {
    "us":            "United States",
    "usa":           "United States",
    "united states": "United States",
    "u.s.":          "United States",
    "u.s.a.":        "United States",
    "uk":            "United Kingdom",
    "u.k.":          "United Kingdom",
    "uae":           "United Arab Emirates",
    "u.a.e.":        "United Arab Emirates",
}

# Industry keyword map intentionally removed.
# extract_industry() returns the user's raw input so the exact value
# from the database is passed to Cortex — no lossy normalisation.
# "Banking" stays "Banking", not silently mapped to "Finance".


# ══════════════════════════════════════════════════════════════
# EXTRACTORS
# ══════════════════════════════════════════════════════════════

def extract_geography(user_input: str) -> str | None:
    """
    Return the geography name as close to the user's input as possible.

    The alias map handles common shorthand (US -> USA, UK -> United Kingdom)
    that the DB is unlikely to store in abbreviated form.
    For everything else — including full country names like "Afghanistan" —
    we return the input directly without substitution so the Cortex WHERE
    clause matches the exact value stored in target_geography.
    """
    lower = user_input.strip().lower()

    # Resolve common abbreviations to their full canonical form
    for alias, canonical in _GEO_ALIASES.items():
        if re.search(r'\b' + re.escape(alias) + r'\b', lower):
            return canonical

    # Short input (1-3 words) is almost certainly just a place name
    stripped = user_input.strip()
    if len(stripped.split()) <= 3 and len(stripped) <= 40:
        return stripped.title()

    # Longer input — use GPT to extract the place name only
    prompt = f"""Extract the geography (country, region, or continent) from the user input.
Return ONLY the exact name the user mentioned (e.g. "Afghanistan", "India", "Europe").
Do NOT substitute synonyms or abbreviations.
Return "NONE" if no geography is mentioned.
No explanation.

User input: "{user_input}"
"""
    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=20).strip()
        if result.upper() == "NONE" or not result:
            return None
        return result
    except Exception:
        return stripped.title() if stripped else None


def extract_industry(user_input: str) -> str | None:
    """
    Return the industry name exactly as the user stated it.

    We do NOT normalise or map the value (e.g. "Banking" stays "Banking",
    not "Finance"). This ensures the exact string stored in the Snowflake
    view is passed to Cortex Analyst so the WHERE clause matches.

    GPT is used only to isolate the industry word(s) from a longer
    sentence — it is not allowed to substitute synonyms.
    """
    # If the input is short (1-3 words), it is almost certainly just
    # the industry name — return it directly, title-cased.
    stripped = user_input.strip()
    if len(stripped.split()) <= 3 and len(stripped) <= 40:
        return stripped.title()

    # For longer sentences, use GPT to extract the industry phrase
    # but explicitly forbid synonym substitution.
    prompt = f"""Extract the industry name from the user input.
Return ONLY the exact industry word or phrase the user mentioned.
Do NOT substitute synonyms — "Banking" must stay "Banking", not "Finance".
Return "NONE" if no industry is mentioned.
No explanation. No extra words.

User input: "{user_input}"
"""
    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=20).strip()
        if result.upper() == "NONE" or not result:
            return None
        return result
    except Exception:
        return stripped.title() if stripped else None


def detect_yes_no(user_input: str) -> str:
    """Returns 'yes', 'no', or 'unclear'."""
    lower = user_input.lower().strip()

    yes_words = (
        "yes", "yeah", "yep", "sure", "absolutely", "definitely",
        "of course", "show me", "tell me", "more", "interested",
        "sounds good", "go ahead", "please", "explore",
    )
    no_words = (
        "no", "nope", "skip", "not interested", "don't", "search",
        "new leads", "my own", "start fresh", "different", "own requirements",
    )

    if any(w in lower for w in yes_words):
        return "yes"
    if any(w in lower for w in no_words):
        return "no"

    prompt = f"""Does the following message mean YES or NO?
Reply with only "yes", "no", or "unclear".

Message: "{user_input}"
"""
    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=5).strip().lower()
        if result in ("yes", "no"):
            return result
    except Exception:
        pass

    return "unclear"


# ══════════════════════════════════════════════════════════════
# MESSAGE GENERATORS
# ══════════════════════════════════════════════════════════════

def generate_geo_question(brand: str) -> str:
    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

The user has selected the product: "{brand}"

Ask them which geography they want to target for this campaign.

Rules:
- 1-2 sentences maximum
- Sound like a senior consultant, not a form
- Do not use filler words like "Great" or "Sure"
- Provide 2-3 example regions in parentheses to guide the user
- Professional, direct tone"""

    try:
        return ask_gpt(prompt, temperature=0.5, max_tokens=80)
    except Exception:
        return (
            f"Which geography are you considering for the {brand} campaign? "
            f"(e.g. USA, India, Europe)"
        )


def generate_industry_question(brand: str, geography: str) -> str:
    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

The user is running a campaign for: "{brand}"
Target geography: "{geography}"

Ask which industry their product primarily targets in this region.

Rules:
- 1-2 sentences maximum
- Professional, direct tone — no filler phrases
- Give 2-3 example industries in parentheses
- If the brand name implies a sector (e.g. "AI", "Cloud"), reference it naturally"""

    try:
        return ask_gpt(prompt, temperature=0.5, max_tokens=80)
    except Exception:
        return (
            f"Which industry does {brand} primarily target in {geography}? "
            f"(e.g. Technology, Healthcare, Finance)"
        )


def generate_campaign_found_message(
    brand: str,
    geography: str,
    industry: str,
    campaign_count: int,
    campaign_names: list[str],
) -> str:
    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

Campaign search context:
- Product: "{brand}"
- Geography: {geography}
- Industry: {industry}
- Past campaigns found: {campaign_count}
- Sample names: {json.dumps(campaign_names[:3])}

Write a concise professional message (2-3 sentences) that:
1. States the number of matching past campaigns found
2. Briefly references 1-2 campaign names to establish credibility
3. Invites the user to review them

No filler. No emojis. Analytical tone."""

    try:
        return ask_gpt(prompt, temperature=0.4, max_tokens=120)
    except Exception:
        return (
            f"Found {campaign_count} past campaigns targeting {industry} in {geography}. "
            f"These were run for similar client profiles and may provide useful benchmarks. "
            f"Review the campaigns below to explore further."
        )


def generate_icp_interest_question(campaign: dict) -> str:
    name   = campaign.get("campaign_name") or "this campaign"
    client = campaign.get("client_name") or ""
    qty    = campaign.get("total_quantity") or ""

    context_parts = [f'"{name}"']
    if client:
        context_parts.append(f"run by {client}")
    if qty:
        context_parts.append(f"{qty} leads targeted")

    context_line = " — ".join(context_parts)

    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

Present this past campaign to the user: {context_line}

Ask if they want to explore the Ideal Customer Profile (ICP) used in this campaign — 
specifically: target job level, job title, employee size, revenue range, and geography.

Rules:
- 2-3 sentences maximum
- Professional, consultative tone
- End with a clear yes/no question
- No emojis, no filler phrases"""

    try:
        return ask_gpt(prompt, temperature=0.5, max_tokens=100)
    except Exception:
        return (
            f"The campaign {context_line} appears relevant to your requirements. "
            f"Would you like to explore the Ideal Customer Profile used in this campaign — "
            f"including target job titles, seniority, company size, and revenue range?"
        )


def generate_no_campaigns_message(brand: str, geography: str, industry: str) -> str:
    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

A search for past campaigns returned no results:
- Product: {brand}
- Geography: {geography}
- Industry: {industry}

Write a concise message (2 sentences) that:
1. Clearly states no matching past campaigns were found
2. Offers to build a custom lead search based on their specific requirements

No filler. Direct and professional."""

    try:
        return ask_gpt(prompt, temperature=0.4, max_tokens=80)
    except Exception:
        return (
            f"No past campaigns were found matching {industry} in {geography}. "
            f"We will now gather your specific requirements to build a custom lead search."
        )


def generate_icp_narrative(
    campaign: dict,
    icp_rows: list[dict],
) -> str:
    name = campaign.get("campaign_name") or "this campaign"
    icp_summary = json.dumps(icp_rows[:4], indent=2, default=str) if icp_rows else "not available"

    prompt = f"""You are Delphi, a B2B campaign intelligence analyst.

Campaign: "{name}"
ICP targeting data (sample): {icp_summary}

Write a 2-3 sentence professional summary that:
1. Describes the ICP targeting profile in plain English
2. Highlights the key audience segments targeted
3. Offers the user the option to use this as a template or define their own criteria

No filler. Analytical and direct."""

    try:
        return ask_gpt(prompt, temperature=0.4, max_tokens=120)
    except Exception:
        return (
            f"The ICP data for \"{name}\" is displayed below. "
            f"You can adopt this targeting profile for your campaign or proceed with your own criteria."
        )

def generate_geo_question(brand: str) -> str:
    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

The user has selected the product: "{brand}"

Casually ask which geography they have in mind for this campaign.

Rules:
- 1-2 sentences maximum
- Conversational but professional — like asking a colleague, not filling a form
- Do not use filler words like "Great" or "Sure"
- Do NOT list or suggest specific geographies — those will be shown as chips in the UI
- Do not use the word "target" — keep it natural"""

    try:
        return ask_gpt(prompt, temperature=0.5, max_tokens=80)
    except Exception:
        return (
            f"Which geography are you considering for the {brand} campaign? "
            f"(e.g. USA, India, Europe)"
        )

def generate_handoff_to_context_message(brand: str, geography: str, industry: str) -> str:
    prompt = f"""You are Delphi, a B2B campaign intelligence assistant.

The user has chosen to define their own targeting criteria instead of using a past campaign profile.
Product: {brand}
Geography: {geography}
Industry: {industry}

Write a concise transition message (1-2 sentences) that:
1. Acknowledges their choice
2. States you will now gather their specific product and audience requirements

Professional tone. No filler phrases."""

    try:
        return ask_gpt(prompt, temperature=0.4, max_tokens=60)
    except Exception:
        return (
            f"We will now gather your specific requirements for the {brand} campaign "
            f"targeting {industry} in {geography}."
        )