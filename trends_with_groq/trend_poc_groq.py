"""
trend_poc_groq.py
POC: Pulls data from fetch_trends.py + fetch_keyword_data.py + fetch_holidays.py,
then sends the combined dataset to Groq LLM for a market trend narrative.

Usage:
    python trend_poc_groq.py "mac" US
    python trend_poc_groq.py              # interactive prompts

Requires GROQ_API_KEY — add it to backend/.env
"""

import sys
import os
import time

# Ensure local standalone scripts are importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from concurrent.futures import ThreadPoolExecutor
import requests
from dotenv import load_dotenv

# ── Import fetch functions from existing standalone scripts ───────────────────
from fetch_trends       import fetch_trends
from fetch_keyword_data import fetch_keyword_data, LOCATION_MAP, MONTH_NAMES
from fetch_holidays     import fetch_holidays, PAST_YEAR

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Groq config ───────────────────────────────────────────────────────────────

GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL    = "llama-3.3-70b-versatile"
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


# ── Safe wrappers (fetch_* scripts call sys.exit on hard errors) ──────────────

def safe_fetch(fn, *args):
    try:
        return fn(*args)
    except SystemExit:
        return [] if fn.__name__ != "fetch_keyword_data" else {}
    except Exception as e:
        print(f"[WARN] {fn.__name__} failed: {e}")
        return [] if fn.__name__ != "fetch_keyword_data" else {}


# ── Prompt builder ────────────────────────────────────────────────────────────

def build_prompt(keyword: str, country: str, country_name: str,
                 trends: list, kw: dict, holidays: list) -> str:

    # Trends: comma-separated weekly values oldest → newest
    trend_values = ", ".join(f"{p['date']}: {p['value']}" for p in trends) if trends else "No data"
    if trends:
        peak = max(trends, key=lambda p: p["value"])
        low  = min(trends, key=lambda p: p["value"])
        trend_meta = f"Peak: {peak['value']}/100 ({peak['date']})  |  Low: {low['value']}/100 ({low['date']})"
    else:
        trend_meta = ""

    # Keyword data
    volume   = kw.get("search_volume", "N/A")
    cpc      = f"${kw['cpc']:.2f}" if kw.get("cpc") else "N/A"
    comp     = kw.get("competition", "N/A")
    comp_idx = kw.get("competition_index", "N/A")
    monthly  = sorted(kw.get("monthly_searches") or [], key=lambda m: (m["year"], m["month"]))
    monthly_str = ", ".join(
        f"{MONTH_NAMES[m['month']]} {m['year']}: {m['search_volume']:,}"
        for m in monthly
    ) if monthly else "No data"

    # Holidays
    holiday_str = "\n".join(f"  {h['date']}: {h['name']}" for h in holidays) if holidays else "  None"

    vol_str = f"{volume:,}" if isinstance(volume, int) else str(volume)

    return f"""You are a market trend analyst writing for a B2B product manager.

Keyword : {keyword}
Country : {country_name} ({country})

--- GOOGLE TRENDS (weekly interest 0-100, past 12 months, oldest first) ---
{trend_values}
{trend_meta}

--- GOOGLE ADS KEYWORD DATA ---
Avg monthly search volume : {vol_str}
CPC                       : {cpc}
Competition               : {comp}  (index: {comp_idx}/100)
Monthly breakdown (oldest first):
{monthly_str}

--- PUBLIC HOLIDAYS ({country}, {PAST_YEAR}) ---
{holiday_str}

Write a market trend narrative:
1. One opening paragraph - overall demand direction over the past year. No emoji. No hedging.
2. A paragraph starting with a relevant emoji - the demand peak: when, how high, and which holiday or event drove it.
3. A paragraph starting with a relevant emoji - the seasonal low: when and why it typically dips.
4. A paragraph starting with a relevant emoji - current momentum: where interest stands right now and what to watch.

Rules: reference actual numbers from the data above, max 350 words, no bullet points in the narrative body.
"""


# ── Groq call ─────────────────────────────────────────────────────────────────

def call_groq(prompt: str) -> tuple[str, float, dict]:
    if not GROQ_API_KEY:
        msg = (
            "ERROR: GROQ_API_KEY is not set.\n"
            "Get a free key at https://console.groq.com and add it to backend/.env:\n"
            "  GROQ_API_KEY=your_key_here"
        )
        return msg, 0.0, {}

    t0 = time.time()
    try:
        resp = requests.post(
            GROQ_ENDPOINT,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       GROQ_MODEL,
                "messages":    [{"role": "user", "content": prompt}],
                "temperature": 0.5,
                "max_tokens":  600,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data    = resp.json()
        text    = data["choices"][0]["message"]["content"].strip()
        usage   = data.get("usage", {})
        latency = round(time.time() - t0, 2)
        return text, latency, usage
    except requests.HTTPError as e:
        return f"Groq HTTP {e.response.status_code}: {e.response.text}", 0.0, {}
    except Exception as e:
        return f"Groq call failed: {e}", 0.0, {}


# ── Display ───────────────────────────────────────────────────────────────────

def display_summary(keyword, country, country_name, trends, kw, holidays):
    from fetch_trends import DATE_FROM, TODAY
    line = "-" * 62
    print(f"\n{line}")
    print(f"  Data Fetched -- \"{keyword}\" -- {country} ({country_name})")
    print(f"  Period : {DATE_FROM}  to  {TODAY}")
    print(line)

    if trends:
        vals = [p["value"] for p in trends]
        peak = max(trends, key=lambda p: p["value"])
        print(f"  Google Trends  : {len(trends)} weeks  |  avg {round(sum(vals)/len(vals),1)}  |  peak {peak['value']} ({peak['date']})")
    else:
        print("  Google Trends  : no data")

    vol = kw.get("search_volume")
    if vol:
        cpc  = f"${kw['cpc']:.2f}" if kw.get("cpc") else "N/A"
        comp = kw.get("competition", "N/A")
        print(f"  DataForSEO     : avg {vol:,}/mo  |  CPC {cpc}  |  competition {comp}")
    else:
        print("  DataForSEO     : no data")

    print(f"  Holidays       : {len(holidays)} public holidays in {PAST_YEAR}")
    print(line)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) >= 3:
        keyword = sys.argv[1].strip()
        country = sys.argv[2].strip().upper()
    elif len(sys.argv) == 2:
        keyword = sys.argv[1].strip()
        country = input("Enter country code (e.g. US, GB, IN): ").strip().upper()
    else:
        keyword = input("Enter keyword: ").strip()
        country = input("Enter country code (e.g. US, GB, IN): ").strip().upper()

    if not keyword:
        print("Error: keyword cannot be empty.")
        sys.exit(1)

    if country not in LOCATION_MAP:
        print(f"Error: '{country}' not supported. Options: {', '.join(LOCATION_MAP)}")
        sys.exit(1)

    location_code, country_name = LOCATION_MAP[country]

    print(f"\nFetching data for \"{keyword}\" in {country} ({country_name})...")

    # Fetch all 3 sources concurrently
    with ThreadPoolExecutor(max_workers=3) as ex:
        f_trends   = ex.submit(safe_fetch, fetch_trends,       keyword, country)
        f_kw       = ex.submit(safe_fetch, fetch_keyword_data, keyword, location_code)
        f_holidays = ex.submit(safe_fetch, fetch_holidays,     country, PAST_YEAR)
        trends   = f_trends.result()
        kw_data  = f_kw.result()
        holidays = f_holidays.result()

    display_summary(keyword, country, country_name, trends, kw_data, holidays)

    print(f"\n  Calling Groq ({GROQ_MODEL})...")
    prompt = build_prompt(keyword, country, country_name, trends, kw_data, holidays)
    narrative, latency, usage = call_groq(prompt)

    line = "-" * 62
    print(f"\n{line}")
    print(f"  Groq Narrative  |  model: {GROQ_MODEL}  |  {latency}s")
    if usage:
        print(f"  Tokens : {usage.get('prompt_tokens',0)} prompt + {usage.get('completion_tokens',0)} completion")
    print(line)
    print()
    print(narrative)
    print(f"\n{line}\n")


if __name__ == "__main__":
    main()
