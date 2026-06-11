"""
categorize_brands.py
─────────────────────────────────────────────────────────────────
Batch job: reads all active brands from MST_TBLBRAND (Snowflake),
categorizes each one (GPT, with scrape fallback for unknowns), and
writes the result into MST_TBLBRAND_CATEGORY.

Already-categorized brands (present in MST_TBLBRAND_CATEGORY) are
skipped, so this script is safe to re-run / resume.

Run from the project root:
    cd backend
    python ../categorize_brands.py [--limit N]
"""

import os
import sys
import asyncio
import argparse

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(SCRIPT_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

import snowflake.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from apis.campaign_suggest.brand_category_service import categorize_brand_with_fallback

SF_CFG = {
    "account":   os.getenv("SNOWFLAKE_ACCOUNT"),
    "user":      os.getenv("SNOWFLAKE_USER"),
    "password":  os.getenv("SNOWFLAKE_PASSWORD"),
    "role":      os.getenv("SNOWFLAKE_ROLE"),
    "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE"),
    "database":  os.getenv("SNOWFLAKE_DATABASE"),
    "schema":    os.getenv("SNOWFLAKE_SCHEMA"),
}


async def main(limit: int | None):
    conn = snowflake.connector.connect(**SF_CFG)
    cur = conn.cursor()

    cur.execute("""
        SELECT b.BRAND_ID, b.BRAND_NAME
        FROM MST_TBLBRAND b
        LEFT JOIN MST_TBLBRAND_CATEGORY c ON b.BRAND_ID = c.BRAND_ID
        WHERE b.ISACTIVE = TRUE AND c.BRAND_ID IS NULL
        ORDER BY b.BRAND_ID
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if limit:
        rows = rows[:limit]

    print(f"Brands to categorize: {len(rows)}")

    for i, (brand_id, brand_name) in enumerate(rows, 1):
        if not brand_name or not brand_name.strip():
            continue
        try:
            result = await categorize_brand_with_fallback(brand_id, brand_name.strip())
            print(f"[{i}/{len(rows)}] {brand_name!r} -> {result['category']} ({result['source']})")
        except Exception as e:
            print(f"[{i}/{len(rows)}] {brand_name!r} -> ERROR: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Only process first N uncategorized brands")
    args = parser.parse_args()

    asyncio.run(main(args.limit))
