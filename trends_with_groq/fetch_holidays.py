"""
fetch_holidays.py
Fetch public holidays for any country for the past year using Holiday API.
Usage:
    python fetch_holidays.py <COUNTRY_CODE>        # e.g. python fetch_holidays.py US
    python fetch_holidays.py                        # prompts for country code
"""

import sys
import os
import json
import datetime
import urllib.request
import urllib.parse

# ── Config ────────────────────────────────────────────────────────────────────

API_KEY = os.environ.get("HOLIDAY_API_KEY", "d91ccb32-8d0f-48b6-b770-7e335d228a7b")
BASE_URL = "https://holidayapi.com/v1/holidays"

# Past year relative to today
PAST_YEAR = datetime.date.today().year - 1


# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_holidays(country: str, year: int) -> list[dict]:
    params = urllib.parse.urlencode({
        "key": API_KEY,
        "country": country.upper(),
        "year": year,
        "public": "true",
        "pretty": "false",
    })
    url = f"{BASE_URL}?{params}"

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code} error: {body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Network error: {e.reason}")
        sys.exit(1)

    if data.get("status") != 200:
        print(f"API error {data.get('status')}: {data.get('error', 'Unknown error')}")
        sys.exit(1)

    return data.get("holidays", [])


# ── Display ───────────────────────────────────────────────────────────────────

def display_holidays(holidays: list[dict], country: str, year: int):
    if not holidays:
        print(f"No public holidays found for {country.upper()} in {year}.")
        return

    line = "-" * 55
    print(f"\n{line}")
    print(f"  Public Holidays -- {country.upper()} -- {year}")
    print(line)
    print(f"  {'Date':<14} Holiday")
    print(line)

    for h in sorted(holidays, key=lambda x: x["date"]):
        print(f"  {h['date']:<14} {h['name']}")

    print(line)
    print(f"  Total: {len(holidays)} holidays\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) >= 2:
        country = sys.argv[1].strip()
    else:
        country = input("Enter country code (e.g. US, GB, IN): ").strip()

    if not country or len(country) != 2 or not country.isalpha():
        print("Error: country code must be a 2-letter ISO code (e.g. US, GB, IN).")
        sys.exit(1)

    print(f"Fetching holidays for {country.upper()} in {PAST_YEAR}...")
    holidays = fetch_holidays(country, PAST_YEAR)
    display_holidays(holidays, country, PAST_YEAR)


if __name__ == "__main__":
    main()
