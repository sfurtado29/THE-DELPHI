from __future__ import annotations
import os
import requests
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor

from apis.p3_campaign.openai_service import ask_gpt

# ── Geography resolution map ─────────────────────────────────────────────────
_GEO_MAP: dict[str, dict] = {
    "united states":        {"serp_geo": "US",  "dfs_location_code": 2840,  "holiday_country": "US"},
    "united kingdom":       {"serp_geo": "GB",  "dfs_location_code": 2826,  "holiday_country": "GB"},
    "india":                {"serp_geo": "IN",  "dfs_location_code": 2356,  "holiday_country": "IN"},
    "canada":               {"serp_geo": "CA",  "dfs_location_code": 2124,  "holiday_country": "CA"},
    "australia":            {"serp_geo": "AU",  "dfs_location_code": 2036,  "holiday_country": "AU"},
    "germany":              {"serp_geo": "DE",  "dfs_location_code": 2276,  "holiday_country": "DE"},
    "united arab emirates": {"serp_geo": "AE",  "dfs_location_code": 2784,  "holiday_country": "AE"},
    "singapore":            {"serp_geo": "SG",  "dfs_location_code": 2702,  "holiday_country": "SG"},
    "france":               {"serp_geo": "FR",  "dfs_location_code": 2250,  "holiday_country": "FR"},
    "japan":                {"serp_geo": "JP",  "dfs_location_code": 2392,  "holiday_country": "JP"},
    "brazil":               {"serp_geo": "BR",  "dfs_location_code": 2076,  "holiday_country": "BR"},
    "netherlands":          {"serp_geo": "NL",  "dfs_location_code": 2528,  "holiday_country": "NL"},
    "sweden":               {"serp_geo": "SE",  "dfs_location_code": 2752,  "holiday_country": "SE"},
    "italy":                {"serp_geo": "IT",  "dfs_location_code": 2380,  "holiday_country": "IT"},
    "spain":                {"serp_geo": "ES",  "dfs_location_code": 2724,  "holiday_country": "ES"},
}

_GEO_ALIASES: dict[str, str] = {
    "us":  "united states",
    "usa": "united states",
    "uk":  "united kingdom",
    "gb":  "united kingdom",
    "uae": "united arab emirates",
    "in":  "india",
    "ca":  "canada",
    "au":  "australia",
    "de":  "germany",
    "fr":  "france",
    "jp":  "japan",
    "br":  "brazil",
    "nl":  "netherlands",
    "se":  "sweden",
    "it":  "italy",
    "es":  "spain",
    "sg":  "singapore",
}

SUPPORTED_GEOS = [k.title() for k in _GEO_MAP]


def _resolve_geo_codes(geography: str) -> dict | None:
    key = geography.strip().lower()
    key = _GEO_ALIASES.get(key, key)
    if key in _GEO_MAP:
        return _GEO_MAP[key]
    for k, v in _GEO_MAP.items():
        if k in key or key in k:
            return v
    return None


# ── API fetchers ─────────────────────────────────────────────────────────────

def fetch_google_trends(keyword: str, geo_code: str) -> list[dict]:
    """SerpAPI Google Trends TIMESERIES — returns [{date, value}, ...]"""
    api_key = os.getenv("SERPAPI_KEY", "")
    if not api_key:
        print("[Trends] SERPAPI_KEY not set — skipping Google Trends")
        return []
    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params={
                "engine":    "google_trends",
                "q":         keyword,
                "geo":       geo_code,
                "date":      "today 12-m",
                "data_type": "TIMESERIES",
                "api_key":   api_key,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        timeline = (data.get("interest_over_time") or {}).get("timeline_data") or []
        result = []
        for point in timeline:
            try:
                date_str = point.get("date", "")
                values   = point.get("values") or []
                val      = int(values[0].get("extracted_value", 0)) if values else 0
                result.append({"date": date_str, "value": val})
            except Exception:
                continue
        return result
    except Exception as e:
        print(f"[Trends] Google Trends fetch failed: {e}")
        return []


def fetch_search_volume(keyword: str, location_code: int) -> list[dict]:
    """DataForSEO Google Ads search volume — returns [{year, month, search_volume}, ...]"""
    login    = os.getenv("DATAFORSEO_LOGIN", "")
    password = os.getenv("DATAFORSEO_PASSWORD", "")
    if not login or not password:
        print("[Trends] DATAFORSEO credentials not set — skipping search volume")
        return []
    try:
        today      = date.today()
        date_from  = (today.replace(year=today.year - 1)).strftime("%Y-%m-%d")
        date_to    = today.strftime("%Y-%m-%d")
        resp = requests.post(
            "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
            auth=(login, password),
            json=[{
                "keywords":      [keyword],
                "location_code": location_code,
                "date_from":     date_from,
                "date_to":       date_to,
            }],
            timeout=20,
        )
        resp.raise_for_status()
        payload = resp.json()
        tasks = (payload.get("tasks") or [{}])[0]
        result_items = (tasks.get("result") or [{}])[0].get("monthly_searches") or []
        rows = []
        for item in result_items:
            try:
                rows.append({
                    "year":          item["year"],
                    "month":         item["month"],
                    "search_volume": item.get("search_volume", 0),
                })
            except Exception:
                continue
        rows.sort(key=lambda r: (r["year"], r["month"]))
        return rows
    except Exception as e:
        print(f"[Trends] DataForSEO fetch failed: {e}")
        return []


def fetch_holidays(country_code: str, years: list[int]) -> list[dict]:
    """HolidayAPI — returns [{date, name}, ...] sorted by date"""
    try:
        import holidayapi  # type: ignore
    except ImportError:
        print("[Trends] holidayapi package not installed — skipping holidays")
        return []
    api_key = os.getenv("HOLIDAY_API_KEY", "")
    if not api_key:
        print("[Trends] HOLIDAY_API_KEY not set — skipping holidays")
        return []
    try:
        hapi   = holidayapi.HolidayApi({"key": api_key})
        result = []
        for year in years:
            response = hapi.holidays({"country": country_code, "year": str(year)})
            for h in (response.get("holidays") or []):
                try:
                    result.append({"date": h["date"], "name": h["name"]})
                except Exception:
                    continue
        result.sort(key=lambda h: h["date"])
        return result
    except Exception as e:
        print(f"[Trends] HolidayAPI fetch failed: {e}")
        return []


# ── Holiday context builder ───────────────────────────────────────────────────

def _holiday_context(trends_data: list[dict], holidays: list[dict]) -> str:
    """Return holidays within ±14 days of any top-20% trend peak."""
    if not trends_data or not holidays:
        return "None identified"
    from datetime import datetime
    values = [p["value"] for p in trends_data if isinstance(p.get("value"), int)]
    if not values:
        return "None identified"
    threshold = max(values) * 0.8
    peak_dates = []
    for point in trends_data:
        if isinstance(point.get("value"), int) and point["value"] >= threshold:
            raw = point.get("date", "")
            # SerpAPI date format: "Nov 3 – 9, 2024" — take first date token
            try:
                token = raw.split("–")[0].strip().split(",")[0].strip()
                parsed = datetime.strptime(token + f" {raw.split(',')[-1].strip()}", "%b %d %Y")
                peak_dates.append(parsed.date())
            except Exception:
                pass

    if not peak_dates:
        return "None identified"

    relevant = []
    for h in holidays:
        try:
            hd = date.fromisoformat(h["date"])
            for pd in peak_dates:
                if abs((hd - pd).days) <= 14:
                    relevant.append(f"{h['date']}: {h['name']}")
                    break
        except Exception:
            continue

    return "; ".join(dict.fromkeys(relevant)) if relevant else "None identified"


# ── GPT synthesis ─────────────────────────────────────────────────────────────

def _synthesize(keyword: str, geography: str, trends_data: list, volume_data: list, holiday_ctx: str) -> str:
    trends_values = [p["value"] for p in trends_data] if trends_data else []
    monthly_volumes = [
        {"month": f"{r['year']}-{r['month']:02d}", "vol": r["search_volume"]}
        for r in volume_data
    ] if volume_data else []

    live_data_available = bool(trends_values or monthly_volumes)

    if live_data_available:
        data_section = f"""GOOGLE TRENDS weekly interest (0-100, last 52 weeks, oldest first):
{trends_values if trends_values else "No data available"}

GOOGLE ADS monthly search volume (actual searches, oldest first):
{monthly_volumes if monthly_volumes else "No data available"}

NOTABLE HOLIDAYS / EVENTS near any peaks:
{holiday_ctx}"""
        rules = (
            "Rules: data-only (no invented numbers), name holidays if within 2 weeks of a peak, "
            '"right now" = final 2 trend data points, no bullet points, max 350 words.'
        )
    else:
        data_section = (
            "Live trend data is currently unavailable. "
            "Use your training knowledge about this product/market to write the narrative."
        )
        rules = (
            "Rules: draw on your knowledge of this product category and market — be specific about "
            "known seasonal patterns, typical demand cycles, and relevant market dynamics. "
            "Do NOT invent fake numbers. Use qualitative directional language (rising, declining, peaks in Q4, etc). "
            "No bullet points, max 300 words."
        )

    prompt = f"""You are a market trend analyst writing for a B2B product manager.

Product: {keyword}
Geography: {geography}

{data_section}

Write a trend narrative:
1. One opening paragraph (no emoji) — overall direction.
2. Three to five emoji-led paragraphs, one insight each: seasonal low / seasonal peak / secondary peak / current position.
Each emoji paragraph: 2-3 sentences, no hedging.
{rules}"""

    return ask_gpt(prompt, temperature=0.4, max_tokens=500)


# ── Public entry point ────────────────────────────────────────────────────────

def analyze_trends(product: str, geography: str) -> str:
    """
    Fetch multi-source trend data concurrently and return a GPT-synthesised
    narrative. Raises ValueError("unresolvable_geo") when geography is not
    in the support list; never raises for data/API failures.
    """
    codes = _resolve_geo_codes(geography)
    if not codes:
        raise ValueError("unresolvable_geo")

    year = date.today().year

    with ThreadPoolExecutor(max_workers=3) as ex:
        f_trends  = ex.submit(fetch_google_trends,  product, codes["serp_geo"])
        f_volume  = ex.submit(fetch_search_volume,  product, codes["dfs_location_code"])
        f_holidays = ex.submit(fetch_holidays, codes["holiday_country"], [year - 1, year])
        trends_data  = f_trends.result()
        volume_data  = f_volume.result()
        holiday_data = f_holidays.result()

    holiday_ctx = _holiday_context(trends_data, holiday_data)

    try:
        return _synthesize(product, geography, trends_data, volume_data, holiday_ctx)
    except Exception as e:
        print(f"[Trends] GPT synthesis failed: {e}")
        return f"I wasn't able to generate the trend analysis for {product} in {geography} right now. Please try again."
