from __future__ import annotations
import os
import requests
from datetime import date, timedelta
from fastapi import APIRouter

router = APIRouter(prefix="/trends", tags=["Trends"])


@router.get("/diagnose")
def diagnose(keyword: str = "mac", geo: str = "US", location_code: int = 2840):
    """
    Tests each external API independently.
    Hit: GET /trends/diagnose?keyword=mac&geo=US&location_code=2840
    """
    results = {}

    # ── 1. Environment keys ───────────────────────────────────
    results["env"] = {
        "SERPAPI_KEY":         bool(os.getenv("SERPAPI_KEY")),
        "DATAFORSEO_LOGIN":    bool(os.getenv("DATAFORSEO_LOGIN")),
        "DATAFORSEO_PASSWORD": bool(os.getenv("DATAFORSEO_PASSWORD")),
        "HOLIDAY_API_KEY":     bool(os.getenv("HOLIDAY_API_KEY")),
    }

    # ── 2. SerpAPI ────────────────────────────────────────────
    serp_key = os.getenv("SERPAPI_KEY", "")
    if serp_key:
        try:
            resp = requests.get(
                "https://serpapi.com/search",
                params={
                    "engine":    "google_trends",
                    "q":         keyword,
                    "geo":       geo,
                    "date":      "today 12-m",
                    "data_type": "TIMESERIES",
                    "api_key":   serp_key,
                },
                timeout=15,
            )
            data = resp.json()
            timeline = (data.get("interest_over_time") or {}).get("timeline_data") or []
            results["serpapi"] = {
                "status_code":    resp.status_code,
                "points_returned": len(timeline),
                "first_point":    timeline[0] if timeline else None,
                "error":          data.get("error"),
            }
        except Exception as e:
            results["serpapi"] = {"error": str(e)}
    else:
        results["serpapi"] = {"error": "SERPAPI_KEY not set"}

    # ── 3. DataForSEO ─────────────────────────────────────────
    dfs_login    = os.getenv("DATAFORSEO_LOGIN", "")
    dfs_password = os.getenv("DATAFORSEO_PASSWORD", "")
    if dfs_login and dfs_password:
        try:
            today     = date.today()
            date_from = today.replace(year=today.year - 1).strftime("%Y-%m-%d")
            date_to   = today.strftime("%Y-%m-%d")
            resp = requests.post(
                "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
                auth=(dfs_login, dfs_password),
                json=[{
                    "keywords":      [keyword],
                    "location_code": location_code,
                    "date_from":     date_from,
                    "date_to":       date_to,
                }],
                timeout=20,
            )
            payload  = resp.json()
            tasks    = (payload.get("tasks") or [{}])[0]
            task_err = tasks.get("status_message", "")
            monthly  = (tasks.get("result") or [{}])[0].get("monthly_searches") or []
            monthly_sorted = sorted(monthly, key=lambda m: (m.get("year", 0), m.get("month", 0)))
            results["dataforseo"] = {
                "status_code":     resp.status_code,
                "task_status":     task_err,
                "date_range":      f"{date_from} → {date_to}",
                "months_returned": len(monthly_sorted),
                "oldest_month":    monthly_sorted[0] if monthly_sorted else None,
                "newest_month":    monthly_sorted[-1] if monthly_sorted else None,
            }
        except Exception as e:
            results["dataforseo"] = {"error": str(e)}
    else:
        results["dataforseo"] = {"error": "DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD not set"}

    # ── 4. HolidayAPI ─────────────────────────────────────────
    holiday_key = os.getenv("HOLIDAY_API_KEY", "")
    if holiday_key:
        try:
            import holidayapi  # type: ignore
            hapi     = holidayapi.HolidayApi({"key": holiday_key})
            response = hapi.holidays({"country": "US", "year": str(date.today().year)})
            holidays = response.get("holidays") or []
            results["holidayapi"] = {
                "holidays_returned": len(holidays),
                "first_holiday":     holidays[0] if holidays else None,
            }
        except ImportError:
            results["holidayapi"] = {"error": "holidayapi package not installed — run: pip install holidayapi"}
        except Exception as e:
            results["holidayapi"] = {"error": str(e)}
    else:
        results["holidayapi"] = {"error": "HOLIDAY_API_KEY not set"}

    return results
