# campaign_profile.py
# ─────────────────────────────────────────────────────────────
# Fetches the logged-in client's brands / services / specialties
# from delphi_company_profiles so Intelligence.js can show the
# product selector without relying on localStorage.
# ─────────────────────────────────────────────────────────────

from __future__ import annotations
from db import get_conn


def get_user_products(user_id: int) -> dict:
    """
    Returns a dict with three lists:
      brands      — scraped product brand names  (product-based company)
      services    — service names                 (service-based company)
      specialties — company speciality areas
    Any column that is NULL or empty returns [].
    """
    conn = get_conn()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT specialties, brands, services, company_name, company_type
            FROM   delphi_company_profiles
            WHERE  user_id = %s
            ORDER  BY id DESC
            LIMIT  1
            """,
            (user_id,),
        )
        row = cursor.fetchone()

        if not row:
            return {
                "found": False,
                "company_name": None,
                "company_type": None,
                "brands": [],
                "services": [],
                "specialties": [],
            }

        specialties_raw, brands_raw, services_raw, company_name, company_type = row

        def _split(raw) -> list[str]:
            if not raw:
                return []
            return [x.strip() for x in str(raw).split(",") if x.strip()]

        return {
            "found":        True,
            "company_name": company_name or "",
            "company_type": company_type or "",
            "brands":       _split(brands_raw),
            "services":     _split(services_raw),
            "specialties":  _split(specialties_raw),
        }

    finally:
        cursor.close()
        conn.close()