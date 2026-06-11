"""
migrate_brand_table.py
─────────────────────────────────────────────────────────────────
1. Migrates Mst_tblclient_brands (MySQL) -> MST_TBLBRAND (Snowflake)
2. Creates an empty MST_TBLBRAND_CATEGORY table (Snowflake) that
   categorize_brands.py will populate.

Run from the project root:
    python migrate_brand_table.py
"""

import os
import sys

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(SCRIPT_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

import mysql.connector
import snowflake.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

MYSQL_CFG = {
    "host":     os.getenv("DB_HOST"),
    "user":     os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "ssl_disabled": True,
}

SF_CFG = {
    "account":   os.getenv("SNOWFLAKE_ACCOUNT"),
    "user":      os.getenv("SNOWFLAKE_USER"),
    "password":  os.getenv("SNOWFLAKE_PASSWORD"),
    "role":      os.getenv("SNOWFLAKE_ROLE"),
    "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE"),
    "database":  os.getenv("SNOWFLAKE_DATABASE"),
    "schema":    os.getenv("SNOWFLAKE_SCHEMA"),
}

MST_TBLBRAND_DDL = """
CREATE TABLE IF NOT EXISTS MST_TBLBRAND (
    BRAND_ID   NUMBER NOT NULL PRIMARY KEY,
    BRAND_NAME VARCHAR(35),
    CLIENT_ID  NUMBER,
    ISACTIVE   BOOLEAN
)
"""

MST_TBLBRAND_CATEGORY_DDL = """
CREATE TABLE IF NOT EXISTS MST_TBLBRAND_CATEGORY (
    BRAND_ID   NUMBER NOT NULL PRIMARY KEY,
    CATEGORY   VARCHAR(100),
    SOURCE     VARCHAR(20),
    CREATED_DT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
)
"""

BRAND_COLUMNS = ["Brand_id", "Brand_name", "Client_id", "Isactive"]


def main():
    missing = [k for k, v in {**MYSQL_CFG, **SF_CFG}.items() if not v]
    if missing:
        print(f"ERROR: Missing env vars: {missing}")
        sys.exit(1)

    print("Connecting to MySQL...")
    mysql_conn = mysql.connector.connect(**MYSQL_CFG)
    my_cur = mysql_conn.cursor()
    print("MySQL connected")

    print("Connecting to Snowflake...")
    sf_conn = snowflake.connector.connect(**SF_CFG)
    sf_cur = sf_conn.cursor()
    print("Snowflake connected")

    try:
        # ── 1. MST_TBLBRAND ──────────────────────────────────────
        print("\nCreating MST_TBLBRAND in Snowflake...")
        sf_cur.execute(MST_TBLBRAND_DDL)

        col_list = ", ".join(BRAND_COLUMNS)
        my_cur.execute(f"SELECT {col_list}, BIN(Isactive + 0) FROM Mst_tblclient_brands")
        rows = my_cur.fetchall()
        # last column from BIN(...) is a string '0'/'1' -> convert to bool, drop original Isactive bit
        rows = [(r[0], r[1], r[2], r[4] == "1") for r in rows]
        print(f"Rows read from MySQL: {len(rows)}")

        sf_cur.execute("TRUNCATE TABLE MST_TBLBRAND")
        sf_cur.executemany(
            "INSERT INTO MST_TBLBRAND (BRAND_ID, BRAND_NAME, CLIENT_ID, ISACTIVE) "
            "VALUES (%s, %s, %s, %s)",
            rows,
        )
        print(f"Rows inserted into MST_TBLBRAND: {len(rows)}")

        # ── 2. MST_TBLBRAND_CATEGORY (empty, populated later) ───
        print("\nCreating MST_TBLBRAND_CATEGORY in Snowflake...")
        sf_cur.execute(MST_TBLBRAND_CATEGORY_DDL)
        print("MST_TBLBRAND_CATEGORY ready")

        print("\nDone.")

    finally:
        my_cur.close()
        mysql_conn.close()
        sf_cur.close()
        sf_conn.close()


if __name__ == "__main__":
    main()
