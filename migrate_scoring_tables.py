"""
migrate_scoring_tables.py
─────────────────────────────────────────────────────────────────
Reads the 9 scoring/ICP/persona master tables from MySQL and
creates + populates them in the new Snowflake account.

Run from the project root:
    cd backend
    python ../migrate_scoring_tables.py

Requires:
    pip install mysql-connector-python snowflake-connector-python python-dotenv
"""

import os
import sys

# ── make sure backend/ is on the path so dotenv picks up .env ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(SCRIPT_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

import mysql.connector
import snowflake.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# ═══════════════════════════════════════════════════════════════
# CONFIG — pulled from existing .env, no changes needed
# ═══════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════
# TABLE DEFINITIONS
# Each entry: (snowflake_table_name, mysql_table_name, create_ddl, insert_columns)
# ═══════════════════════════════════════════════════════════════

TABLES = [
    (
        "MST_SCORING_PARAMETER",
        "mst_scoring_parameter",
        """
        CREATE TABLE IF NOT EXISTS MST_SCORING_PARAMETER (
            PARAMETER_ID   NUMBER        NOT NULL PRIMARY KEY,
            PARAMETER_CODE VARCHAR(50),
            PARAMETER_NAME VARCHAR(100),
            IS_ACTIVE      BOOLEAN,
            CREATED_DT     TIMESTAMP
        )
        """,
        ["parameter_id", "parameter_code", "parameter_name", "is_active", "created_dt"],
    ),
    (
        "MST_SCORING_VALUE",
        "mst_scoring_value",
        """
        CREATE TABLE IF NOT EXISTS MST_SCORING_VALUE (
            SCORING_VALUE_ID NUMBER NOT NULL PRIMARY KEY,
            PARAMETER_ID     NUMBER,
            MASTER_VALUE_ID  NUMBER,
            SCORE            NUMBER,
            IS_ACTIVE        BOOLEAN
        )
        """,
        ["SCORING_VALUE_ID", "PARAMETER_ID", "MASTER_VALUE_ID", "SCORE", "IS_ACTIVE"],
    ),
    (
        "MST_SCORING_WEIGHT",
        "mst_scoring_weight",
        """
        CREATE TABLE IF NOT EXISTS MST_SCORING_WEIGHT (
            WEIGHT_ID    NUMBER NOT NULL PRIMARY KEY,
            PARAMETER_ID NUMBER,
            WEIGHT       NUMBER,
            IS_ACTIVE    BOOLEAN
        )
        """,
        ["WEIGHT_ID", "PARAMETER_ID", "WEIGHT", "IS_ACTIVE"],
    ),
    (
        "MST_ICP_PARAMETER",
        "mst_icp_parameter",
        """
        CREATE TABLE IF NOT EXISTS MST_ICP_PARAMETER (
            PARAMETER_ID   NUMBER        NOT NULL PRIMARY KEY,
            PARAMETER_CODE VARCHAR(100),
            PARAMETER_NAME VARCHAR(255),
            IS_ACTIVE      BOOLEAN
        )
        """,
        ["PARAMETER_ID", "PARAMETER_CODE", "PARAMETER_NAME", "IS_ACTIVE"],
    ),
    (
        "MST_ICP_VALUE",
        "mst_icp_value",
        """
        CREATE TABLE IF NOT EXISTS MST_ICP_VALUE (
            ICP_VALUE_ID    NUMBER NOT NULL PRIMARY KEY,
            PARAMETER_ID    NUMBER,
            MASTER_VALUE_ID NUMBER,
            SCORE           NUMBER,
            IS_ACTIVE       BOOLEAN
        )
        """,
        ["ICP_VALUE_ID", "PARAMETER_ID", "MASTER_VALUE_ID", "SCORE", "IS_ACTIVE"],
    ),
    (
        "MST_ICP_WEIGHT",
        "mst_icp_weight",
        """
        CREATE TABLE IF NOT EXISTS MST_ICP_WEIGHT (
            WEIGHT_ID    NUMBER NOT NULL PRIMARY KEY,
            PARAMETER_ID NUMBER,
            WEIGHT       NUMBER,
            IS_ACTIVE    BOOLEAN
        )
        """,
        ["WEIGHT_ID", "PARAMETER_ID", "WEIGHT", "IS_ACTIVE"],
    ),
    (
        "MST_PERSONA_PARAMETER",
        "mst_persona_parameter",
        """
        CREATE TABLE IF NOT EXISTS MST_PERSONA_PARAMETER (
            PARAMETER_ID   NUMBER        NOT NULL PRIMARY KEY,
            PARAMETER_CODE VARCHAR(100),
            PARAMETER_NAME VARCHAR(255),
            IS_ACTIVE      BOOLEAN
        )
        """,
        ["PARAMETER_ID", "PARAMETER_CODE", "PARAMETER_NAME", "IS_ACTIVE"],
    ),
    (
        "MST_PERSONA_VALUE",
        "mst_persona_value",
        """
        CREATE TABLE IF NOT EXISTS MST_PERSONA_VALUE (
            PERSONA_VALUE_ID NUMBER NOT NULL PRIMARY KEY,
            PARAMETER_ID     NUMBER,
            MASTER_VALUE_ID  NUMBER,
            SCORE            NUMBER,
            IS_ACTIVE        BOOLEAN
        )
        """,
        ["PERSONA_VALUE_ID", "PARAMETER_ID", "MASTER_VALUE_ID", "SCORE", "IS_ACTIVE"],
    ),
    (
        "MST_PERSONA_WEIGHT",
        "mst_persona_weight",
        """
        CREATE TABLE IF NOT EXISTS MST_PERSONA_WEIGHT (
            WEIGHT_ID    NUMBER NOT NULL PRIMARY KEY,
            PARAMETER_ID NUMBER,
            WEIGHT       NUMBER,
            IS_ACTIVE    BOOLEAN
        )
        """,
        ["WEIGHT_ID", "PARAMETER_ID", "WEIGHT", "IS_ACTIVE"],
    ),
]


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def fetch_from_mysql(cursor, table_name: str, columns: list[str]) -> list[tuple]:
    col_list = ", ".join(columns)
    cursor.execute(f"SELECT {col_list} FROM {table_name}")
    return cursor.fetchall()


def migrate_table(sf_cur, my_cur, sf_table, my_table, ddl, columns):
    print(f"\n{'─'*50}")
    print(f"  Migrating: {my_table} → {sf_table}")

    # 1. Create table in Snowflake
    sf_cur.execute(ddl)
    print(f"  Table created / already exists in Snowflake")

    # 2. Read from MySQL
    rows = fetch_from_mysql(my_cur, my_table, columns)
    print(f"  Rows read from MySQL: {len(rows)}")

    if not rows:
        print(f"  Nothing to insert — skipping")
        return

    # 3. Truncate Snowflake table first (clean slate on re-run)
    sf_cur.execute(f"TRUNCATE TABLE {sf_table}")

    # 4. Bulk insert into Snowflake
    placeholders = ", ".join(["%s"] * len(columns))
    col_list = ", ".join(columns)
    insert_sql = f"INSERT INTO {sf_table} ({col_list}) VALUES ({placeholders})"

    sf_cur.executemany(insert_sql, rows)
    print(f"  Rows inserted into Snowflake: {len(rows)}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 50)
    print("  Scoring Tables Migration: MySQL → Snowflake")
    print("=" * 50)

    # Validate env
    missing = [k for k, v in {**MYSQL_CFG, **SF_CFG}.items() if not v]
    if missing:
        print(f"\nERROR: Missing env vars: {missing}")
        print("Check your backend/.env file.")
        sys.exit(1)

    mysql_conn = None
    sf_conn    = None

    try:
        print("\nConnecting to MySQL...")
        mysql_conn = mysql.connector.connect(**MYSQL_CFG)
        my_cur = mysql_conn.cursor()
        print("MySQL connected")

        print("Connecting to Snowflake...")
        sf_conn = snowflake.connector.connect(**SF_CFG)
        sf_cur  = sf_conn.cursor()
        print("Snowflake connected")

        for sf_table, my_table, ddl, columns in TABLES:
            try:
                migrate_table(sf_cur, my_cur, sf_table, my_table, ddl, columns)
            except Exception as e:
                print(f"\n  ERROR on {my_table}: {e}")
                print("  Skipping this table — continuing with others")

        print(f"\n{'='*50}")
        print("  Migration complete")
        print("=" * 50)

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)

    finally:
        for cur in [my_cur if mysql_conn else None, sf_cur if sf_conn else None]:
            try:
                if cur: cur.close()
            except: pass
        if mysql_conn:
            try: mysql_conn.close()
            except: pass
        if sf_conn:
            try: sf_conn.close()
            except: pass


if __name__ == "__main__":
    main()
