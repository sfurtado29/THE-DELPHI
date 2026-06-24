"""
fetch_trends.py
Fetch Google Trends (weekly interest over time) for any search term and country
for the past 12 months using SerpAPI.

Usage:
    python fetch_trends.py "<search term>" <COUNTRY_CODE>
    python fetch_trends.py "electric vehicles" US
    python fetch_trends.py                              # prompts interactively
"""

import sys
import os
import datetime
import unicodedata

import requests

# Force UTF-8 output on Windows terminals that default to cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Config ────────────────────────────────────────────────────────────────────

API_KEY  = os.environ.get("SERPAPI_KEY", "60b5db77450b1d269dcf75dd7ad9d8d3d24f056910535aeefc77d3dfdde85019")
BASE_URL = "https://serpapi.com/search"

TODAY     = datetime.date.today()
DATE_FROM = TODAY.replace(year=TODAY.year - 1)


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_trends(query: str, country: str) -> list[dict]:
    """Return [{date, value}, ...] weekly timeseries from SerpAPI."""
    try:
        resp = requests.get(
            BASE_URL,
            params={
                "engine":    "google_trends",
                "q":         query,
                "geo":       country.upper(),
                "date":      "today 12-m",
                "data_type": "TIMESERIES",
                "api_key":   API_KEY,
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.HTTPError as e:
        print(f"HTTP {e.response.status_code} error: {e.response.text}")
        sys.exit(1)
    except requests.ConnectionError as e:
        print(f"Network error: {e}")
        sys.exit(1)

    timeline = (data.get("interest_over_time") or {}).get("timeline_data") or []
    if not timeline:
        return []

    result = []
    for point in timeline:
        values   = point.get("values") or []
        val      = int(values[0].get("extracted_value", 0)) if values else 0
        raw_date = point.get("date", "")
        # Normalize Unicode whitespace/dashes to plain ASCII
        clean_date = unicodedata.normalize("NFKD", raw_date)
        clean_date = clean_date.replace("–", "-").replace(" ", " ").encode("ascii", "ignore").decode()
        result.append({"date": clean_date, "value": val})

    return result


# ── Stats ─────────────────────────────────────────────────────────────────────

def compute_stats(data: list[dict]) -> dict:
    values = [p["value"] for p in data]
    peak_idx = values.index(max(values))
    low_idx  = values.index(min(values))

    # Simple trend: compare average of first 25% vs last 25%
    quarter = max(1, len(values) // 4)
    avg_start = sum(values[:quarter]) / quarter
    avg_end   = sum(values[-quarter:]) / quarter
    if avg_end > avg_start * 1.05:
        direction = "Rising"
    elif avg_end < avg_start * 0.95:
        direction = "Declining"
    else:
        direction = "Stable"

    return {
        "peak_week":  data[peak_idx]["date"],
        "peak_value": values[peak_idx],
        "low_week":   data[low_idx]["date"],
        "low_value":  values[low_idx],
        "average":    round(sum(values) / len(values), 1),
        "direction":  direction,
    }


# ── Sparkline ─────────────────────────────────────────────────────────────────

BARS = " _.,:-=+*#%@"

def sparkline(values: list[int], width: int = 52) -> str:
    if not values:
        return ""
    mn, mx = min(values), max(values)
    rng = mx - mn or 1
    chars = []
    for v in values:
        idx = int((v - mn) / rng * (len(BARS) - 1))
        chars.append(BARS[idx])
    # If data is wider than width, sample it
    if len(chars) > width:
        step = len(chars) / width
        chars = [chars[int(i * step)] for i in range(width)]
    return "".join(chars)


# ── Display ───────────────────────────────────────────────────────────────────

def display(data: list[dict], query: str, country: str):
    stats = compute_stats(data)
    line  = "-" * 62

    print(f"\n{line}")
    print(f"  Google Trends -- \"{query}\" -- {country.upper()}")
    print(f"  Period : {DATE_FROM}  to  {TODAY}")
    print(line)

    # Summary block
    print(f"  Direction : {stats['direction']}")
    print(f"  Average   : {stats['average']} / 100")
    print(f"  Peak      : {stats['peak_value']} / 100   ({stats['peak_week']})")
    print(f"  Low       : {stats['low_value']} / 100   ({stats['low_week']})")

    # Sparkline
    values = [p["value"] for p in data]
    spark  = sparkline(values)
    print(f"\n  Trend chart (low -> high):")
    print(f"  [{spark}]")
    print(f"   {DATE_FROM.strftime('%b %Y')}{'':>44}{TODAY.strftime('%b %Y')}")

    # Weekly table
    print(f"\n{line}")
    print(f"  {'Week':<32} {'Interest (0-100)':>15}  Bar")
    print(line)

    mx = max(p["value"] for p in data) or 1
    for point in data:
        bar_len = int(point["value"] / mx * 20)
        bar     = "#" * bar_len
        print(f"  {point['date']:<32} {point['value']:>15}  {bar}")

    print(line)
    print(f"  Total weeks: {len(data)}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) >= 3:
        query   = sys.argv[1].strip()
        country = sys.argv[2].strip()
    elif len(sys.argv) == 2:
        query   = sys.argv[1].strip()
        country = input("Enter country code (e.g. US, GB, IN): ").strip()
    else:
        query   = input("Enter search term: ").strip()
        country = input("Enter country code (e.g. US, GB, IN): ").strip()

    if not query:
        print("Error: search term cannot be empty.")
        sys.exit(1)

    if not country or len(country) != 2 or not country.isalpha():
        print("Error: country code must be a 2-letter ISO code (e.g. US, GB, IN).")
        sys.exit(1)

    print(f"Fetching Google Trends for \"{query}\" in {country.upper()} (past 12 months)...")
    data = fetch_trends(query, country)

    if not data:
        print(f"No trend data returned for \"{query}\" in {country.upper()}.")
        sys.exit(0)

    display(data, query, country)


if __name__ == "__main__":
    main()
