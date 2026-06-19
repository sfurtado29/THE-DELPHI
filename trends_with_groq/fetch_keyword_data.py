"""
fetch_keyword_data.py
Fetch keyword data (search volume, CPC, competition, monthly breakdown)
from DataForSEO Google Ads API for any keyword and country.

Usage:
    python fetch_keyword_data.py "<keyword>" <COUNTRY_CODE>
    python fetch_keyword_data.py "cloud computing" US
    python fetch_keyword_data.py                        # prompts interactively
"""

import sys
import os
import datetime
import requests

# Force UTF-8 output on Windows terminals that default to cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Config ────────────────────────────────────────────────────────────────────

LOGIN    = os.environ.get("DATAFORSEO_LOGIN",    "sfurtado@xtsworld.in")
PASSWORD = os.environ.get("DATAFORSEO_PASSWORD", "0fc538bcd3baaf7e")
BASE_URL = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live"

TODAY     = datetime.date.today()
DATE_FROM = TODAY.replace(year=TODAY.year - 1).strftime("%Y-%m-%d")
DATE_TO   = TODAY.strftime("%Y-%m-%d")

MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# ── Country -> DataForSEO location code ──────────────────────────────────────

LOCATION_MAP: dict[str, tuple[int, str]] = {
    "US": (2840, "United States"),
    "GB": (2826, "United Kingdom"),
    "IN": (2356, "India"),
    "CA": (2124, "Canada"),
    "AU": (2036, "Australia"),
    "DE": (2276, "Germany"),
    "AE": (2784, "United Arab Emirates"),
    "SG": (2702, "Singapore"),
    "FR": (2250, "France"),
    "JP": (2392, "Japan"),
    "BR": (2076, "Brazil"),
    "NL": (2528, "Netherlands"),
    "SE": (2752, "Sweden"),
    "IT": (2380, "Italy"),
    "ES": (2724, "Spain"),
    "ZA": (2710, "South Africa"),
    "MX": (2484, "Mexico"),
    "KR": (2410, "South Korea"),
    "NG": (2566, "Nigeria"),
    "PH": (2608, "Philippines"),
}


def resolve_location(country: str) -> tuple[int, str]:
    code = country.strip().upper()
    if code not in LOCATION_MAP:
        supported = ", ".join(LOCATION_MAP.keys())
        print(f"Error: '{code}' not in supported list.\nSupported: {supported}")
        sys.exit(1)
    return LOCATION_MAP[code]


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_keyword_data(keyword: str, location_code: int) -> dict:
    try:
        resp = requests.post(
            BASE_URL,
            auth=(LOGIN, PASSWORD),
            json=[{
                "keywords":      [keyword],
                "location_code": location_code,
                "date_from":     DATE_FROM,
                "date_to":       DATE_TO,
            }],
            timeout=20,
        )
        resp.raise_for_status()
        payload = resp.json()
    except requests.HTTPError as e:
        print(f"HTTP {e.response.status_code} error: {e.response.text}")
        sys.exit(1)
    except requests.ConnectionError as e:
        print(f"Network error: {e}")
        sys.exit(1)

    tasks = (payload.get("tasks") or [{}])[0]

    # API-level error check
    if tasks.get("status_code") != 20000:
        print(f"API error {tasks.get('status_code')}: {tasks.get('status_message')}")
        sys.exit(1)

    result = ((tasks.get("result") or [{}])[0]) or {}
    return result


# ── Stats ─────────────────────────────────────────────────────────────────────

def compute_monthly_stats(monthly: list[dict]) -> dict:
    volumes = [m["search_volume"] for m in monthly]
    if not volumes:
        return {}

    peak  = max(monthly, key=lambda m: m["search_volume"])
    low   = min(monthly, key=lambda m: m["search_volume"])
    avg   = round(sum(volumes) / len(volumes))

    quarter = max(1, len(volumes) // 4)
    avg_start = sum(volumes[:quarter]) / quarter
    avg_end   = sum(volumes[-quarter:]) / quarter
    if avg_end > avg_start * 1.05:
        direction = "Rising"
    elif avg_end < avg_start * 0.95:
        direction = "Declining"
    else:
        direction = "Stable"

    return {
        "peak_label":  f"{MONTH_NAMES[peak['month']]} {peak['year']}",
        "peak_volume": peak["search_volume"],
        "low_label":   f"{MONTH_NAMES[low['month']]} {low['year']}",
        "low_volume":  low["search_volume"],
        "average":     avg,
        "direction":   direction,
    }


# ── Display ───────────────────────────────────────────────────────────────────

COMPETITION_LABELS = {None: "N/A", "LOW": "Low", "MEDIUM": "Medium", "HIGH": "High"}

def display(result: dict, keyword: str, country: str, country_name: str):
    line = "-" * 62

    monthly = sorted(
        result.get("monthly_searches") or [],
        key=lambda m: (m["year"], m["month"])
    )
    stats = compute_monthly_stats(monthly)

    # ── Header ────────────────────────────────────────────────
    print(f"\n{line}")
    print(f"  Keyword Data -- \"{keyword}\" -- {country} ({country_name})")
    print(f"  Period  : {DATE_FROM}  to  {DATE_TO}")
    print(line)

    # ── Overview ──────────────────────────────────────────────
    competition   = result.get("competition")
    comp_index    = result.get("competition_index")
    search_volume = result.get("search_volume", "N/A")
    cpc           = result.get("cpc")
    low_bid       = result.get("low_top_of_page_bid")
    high_bid      = result.get("high_top_of_page_bid")

    comp_str = COMPETITION_LABELS.get(competition, competition or "N/A")
    if comp_index is not None:
        comp_str += f"  (index: {comp_index}/100)"

    print(f"  Avg Monthly Volume : {search_volume:,}" if isinstance(search_volume, int) else f"  Avg Monthly Volume : {search_volume}")
    print(f"  Competition        : {comp_str}")
    print(f"  CPC (avg)          : ${cpc:.2f}" if cpc else "  CPC (avg)          : N/A")
    print(f"  Top-of-page bid    : ${low_bid:.2f} - ${high_bid:.2f}" if low_bid and high_bid else "  Top-of-page bid    : N/A")

    # ── Monthly trend stats ────────────────────────────────────
    if stats:
        print(f"\n  Trend Direction    : {stats['direction']}")
        print(f"  Monthly Average    : {stats['average']:,}")
        print(f"  Peak Month         : {stats['peak_volume']:,}   ({stats['peak_label']})")
        print(f"  Low  Month         : {stats['low_volume']:,}   ({stats['low_label']})")

    # ── Monthly breakdown table ────────────────────────────────
    if monthly:
        mx = max(m["search_volume"] for m in monthly) or 1
        print(f"\n{line}")
        print(f"  {'Month':<12} {'Search Volume':>15}  Bar")
        print(line)
        for m in monthly:
            label   = f"{MONTH_NAMES[m['month']]} {m['year']}"
            vol     = m["search_volume"]
            bar_len = int(vol / mx * 20)
            bar     = "#" * bar_len
            print(f"  {label:<12} {vol:>15,}  {bar}")

    print(line)
    print(f"  Total months: {len(monthly)}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) >= 3:
        keyword = sys.argv[1].strip()
        country = sys.argv[2].strip()
    elif len(sys.argv) == 2:
        keyword = sys.argv[1].strip()
        country = input("Enter country code (e.g. US, GB, IN): ").strip()
    else:
        keyword = input("Enter keyword: ").strip()
        country = input("Enter country code (e.g. US, GB, IN): ").strip()

    if not keyword:
        print("Error: keyword cannot be empty.")
        sys.exit(1)

    location_code, country_name = resolve_location(country)

    print(f"Fetching keyword data for \"{keyword}\" in {country.upper()} (past 12 months)...")
    result = fetch_keyword_data(keyword, location_code)

    if not result:
        print(f"No data returned for \"{keyword}\" in {country.upper()}.")
        sys.exit(0)

    display(result, keyword, country.upper(), country_name)


if __name__ == "__main__":
    main()
