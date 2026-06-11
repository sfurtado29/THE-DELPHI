"""
upload_yaml_to_stage.py
─────────────────────────────────────────────────────────────────
Creates the Snowflake stage (if not exists) and uploads the
CAMPAIGN_DISCOVER YAML semantic model file to it.

Run from the project root:
    python upload_yaml_to_stage.py

Requires:
    pip install snowflake-connector-python python-dotenv
"""

import os
import sys
import tempfile
import shutil

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(SCRIPT_DIR, "backend")

import snowflake.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# ── Source file (in project root) ─────────────────────────────
SOURCE_YAML = os.path.join(SCRIPT_DIR, "CAMPAIGN_DISCOVER_IMPROVED (1).yaml")

# ── Target name inside the stage ──────────────────────────────
STAGE_FILE_NAME = "CAMPAIGN_DISCOVER.yaml"
STAGE_NAME      = "DELPHI_STAGE"

SF_CFG = {
    "account":   os.getenv("SNOWFLAKE_ACCOUNT"),
    "user":      os.getenv("SNOWFLAKE_USER"),
    "password":  os.getenv("SNOWFLAKE_PASSWORD"),
    "role":      os.getenv("SNOWFLAKE_ROLE"),
    "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE"),
    "database":  os.getenv("SNOWFLAKE_DATABASE"),
    "schema":    os.getenv("SNOWFLAKE_SCHEMA"),
}


def main():
    print("=" * 55)
    print("  YAML Upload: local file → Snowflake Stage")
    print("=" * 55)

    # Validate source file exists
    if not os.path.exists(SOURCE_YAML):
        print(f"\nERROR: Source file not found:\n  {SOURCE_YAML}")
        sys.exit(1)

    # Validate env vars
    missing = [k for k, v in SF_CFG.items() if not v]
    if missing:
        print(f"\nERROR: Missing env vars: {missing}")
        print("Check your backend/.env file.")
        sys.exit(1)

    print(f"\nSource : {SOURCE_YAML}")
    print(f"Target : @{STAGE_NAME}/{STAGE_FILE_NAME}")

    # Copy to a temp file with a clean name (no spaces/brackets)
    # PUT command on Windows struggles with spaces in file paths
    tmp_dir  = tempfile.mkdtemp()
    tmp_file = os.path.join(tmp_dir, STAGE_FILE_NAME)

    try:
        shutil.copy2(SOURCE_YAML, tmp_file)
        print(f"\nTemp copy: {tmp_file}")

        print("\nConnecting to Snowflake...")
        conn   = snowflake.connector.connect(**SF_CFG)
        cursor = conn.cursor()
        print("Connected")

        try:
            # 1. Create stage if not exists
            print(f"\nCreating stage '{STAGE_NAME}' if not exists...")
            cursor.execute(f"""
                CREATE STAGE IF NOT EXISTS {STAGE_NAME}
                COMMENT = 'Delphi semantic model files for Cortex Analyst'
            """)
            print(f"Stage ready")

            # 2. Upload YAML — PUT with OVERWRITE so re-runs are safe
            put_cmd = (
                f"PUT 'file://{tmp_file.replace(os.sep, '/')}' "
                f"@{STAGE_NAME} "
                f"AUTO_COMPRESS=FALSE "
                f"OVERWRITE=TRUE"
            )
            print(f"\nUploading...")
            cursor.execute(put_cmd)

            result = cursor.fetchall()
            for row in result:
                # row: (source, target, source_size, target_size, source_compression, target_compression, status, message)
                status  = row[6] if len(row) > 6 else "?"
                message = row[7] if len(row) > 7 else ""
                print(f"  {row[0]} → {row[1]}  [{status}]  {message}")

            # 3. List stage to confirm
            print(f"\nFiles currently in @{STAGE_NAME}:")
            cursor.execute(f"LIST @{STAGE_NAME}")
            files = cursor.fetchall()
            if files:
                for f in files:
                    print(f"  {f[0]}  ({f[1]} bytes)")
            else:
                print("  (empty)")

            print(f"\nDone — YAML is live at @{STAGE_NAME}/{STAGE_FILE_NAME}")

        finally:
            cursor.close()
            conn.close()

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
