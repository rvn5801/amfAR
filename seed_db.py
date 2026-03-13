import os
import glob
import re
import mysql.connector
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

cfg = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "hiv_dashboard"),
}

CLEAN_DIR = os.path.join(os.path.dirname(__file__), "data", "clean")


def safe_int(val):
    try:
        v = int(float(str(val).replace(",", "")))
        return v if v > 0 else None   # negatives and 0 → NULL
    except:
        return None


def safe_float(val):
    try:
        v = float(str(val).replace(",", ""))
        return round(v, 4) if v > 0 else None   # negatives and 0 → NULL
    except:
        return None


def find_col(df, *keywords):
    """Find first column whose name contains any of the keywords (case-insensitive)."""
    for kw in keywords:
        for c in df.columns:
            if kw.lower() in c.lower():
                return c
    return None


def main():
    conn = mysql.connector.connect(**cfg)
    cur = conn.cursor()
    cur.execute("USE hiv_dashboard")

    # ── Recreate tables ──────────────────────────────────────────────────
    print("Recreating tables...")
    cur.execute("DROP TABLE IF EXISTS diagnoses_state")
    cur.execute("DROP TABLE IF EXISTS prep_state")
    cur.execute("DROP TABLE IF EXISTS pnr_state")

    cur.execute("""
        CREATE TABLE diagnoses_state (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year INT, state VARCHAR(60), state_abbr VARCHAR(5),
            total_cases INT, rate_per_100k FLOAT,
            male_cases INT, female_cases INT,
            black_cases INT, black_rate FLOAT,
            hispanic_cases INT, hispanic_rate FLOAT,
            white_cases INT, white_rate FLOAT,
            asian_cases INT,
            age_13_24 INT, age_25_34 INT, age_35_44 INT,
            age_45_54 INT, age_55_64 INT, age_65plus INT,
            msm_cases INT, msm_pct FLOAT,
            idu_cases INT, idu_pct FLOAT,
            heterosexual_cases INT, heterosexual_pct FLOAT
        )
    """)

    cur.execute("""
        CREATE TABLE prep_state (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year INT, state VARCHAR(60), state_abbr VARCHAR(5),
            prep_users INT, prep_rate FLOAT
        )
    """)

    cur.execute("""
        CREATE TABLE pnr_state (
            id INT AUTO_INCREMENT PRIMARY KEY,
            year INT, state VARCHAR(60), state_abbr VARCHAR(5),
            pnr_ratio FLOAT
        )
    """)

    # ── Load newdx CSVs ──────────────────────────────────────────────────
    print("\nLoading New Diagnoses...")
    dx_rows = []
    for fp in sorted(glob.glob(os.path.join(CLEAN_DIR, "newdx_*.csv"))):
        year = int(re.search(r'(\d{4})', os.path.basename(fp)).group(1))
        df = pd.read_csv(fp)
        
        c_state    = find_col(df, "' State", "State'", "State")
        c_abbr     = find_col(df, "Abbreviation")
        c_cases    = find_col(df, "State Cases")
        c_rate     = find_col(df, "State Rate")
        c_male     = find_col(df, "Male Cases")
        c_female   = find_col(df, "Female Cases")
        c_black_c  = find_col(df, "Black Cases")
        c_black_r  = find_col(df, "Black Rate")
        c_hisp_c   = find_col(df, "Hispanic Cases")
        c_hisp_r   = find_col(df, "Hispanic Rate")
        c_white_c  = find_col(df, "White Cases")
        c_white_r  = find_col(df, "White Rate")
        c_asian_c  = find_col(df, "Asian Cases")
        c_a1324    = find_col(df, "Age 13-24 Cases")
        c_a2534    = find_col(df, "Age 25-34 Cases")
        c_a3544    = find_col(df, "Age 35-44 Cases")
        c_a4554    = find_col(df, "Age 45-54 Cases")
        c_a5564    = find_col(df, "Age 55-64 Cases")
        c_a65p     = find_col(df, "Age 65+ Cases")
        c_msm_c    = find_col(df, "MSM Cases")
        c_msm_p    = find_col(df, "MSM Percent")
        c_idu_c    = find_col(df, "IDU Cases", "IDU\nCases")
        c_idu_p    = find_col(df, "IDU Percent", "IDU\nPercent")
        c_het_c    = find_col(df, "Heterosexual Contact Cases")
        c_het_p    = find_col(df, "Heterosexual Contact Percent")

        def g(row, col):
            return row[col] if col and col in row.index else None

        for _, row in df.iterrows():
            state = g(row, c_state)
            if not state or str(state).strip() in ('', 'nan', 'None'):
                continue
            dx_rows.append((
                year, str(state).strip(),
                str(g(row, c_abbr) or '').strip(),
                safe_int(g(row, c_cases)),
                safe_float(g(row, c_rate)),
                safe_int(g(row, c_male)),
                safe_int(g(row, c_female)),
                safe_int(g(row, c_black_c)),
                safe_float(g(row, c_black_r)),
                safe_int(g(row, c_hisp_c)),
                safe_float(g(row, c_hisp_r)),
                safe_int(g(row, c_white_c)),
                safe_float(g(row, c_white_r)),
                safe_int(g(row, c_asian_c)),
                safe_int(g(row, c_a1324)),
                safe_int(g(row, c_a2534)),
                safe_int(g(row, c_a3544)),
                safe_int(g(row, c_a4554)),
                safe_int(g(row, c_a5564)),
                safe_int(g(row, c_a65p)),
                safe_int(g(row, c_msm_c)),
                safe_float(g(row, c_msm_p)),
                safe_int(g(row, c_idu_c)),
                safe_float(g(row, c_idu_p)),
                safe_int(g(row, c_het_c)),
                safe_float(g(row, c_het_p)),
            ))
        print(f"   newdx_{year}.csv — {len(df)} rows")

    cur.executemany("""
        INSERT INTO diagnoses_state VALUES
        (NULL,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, dx_rows)
    print(f"   {len(dx_rows)} diagnosis rows inserted")

    # ── Load prep CSVs ───────────────────────────────────────────────────
    print("\nLoading PrEP data...")
    prep_rows = []
    for fp in sorted(glob.glob(os.path.join(CLEAN_DIR, "prep_*.csv"))):
        year = int(re.search(r'(\d{4})', os.path.basename(fp)).group(1))
        df = pd.read_csv(fp)

        c_state = find_col(df, "State")
        c_abbr  = find_col(df, "Abbreviation")
        c_users = find_col(df, "Users")
        c_rate  = find_col(df, "Rate")

        for _, row in df.iterrows():
            state = row[c_state] if c_state else None
            if not state or str(state).strip() in ('', 'nan', 'None'):
                continue
            prep_rows.append((
                year, str(state).strip(),
                str(row[c_abbr] if c_abbr else '').strip(),
                safe_int(row[c_users] if c_users else None),
                safe_float(row[c_rate] if c_rate else None),
            ))
        print(f"   prep_{year}.csv — {len(df)} rows")

    cur.executemany(
        "INSERT INTO prep_state VALUES (NULL,%s,%s,%s,%s,%s)",
        prep_rows
    )
    print(f"   {len(prep_rows)} PrEP rows inserted")

    # ── Load pnr CSVs ────────────────────────────────────────────────────
    print("\nLoading PNR data...")
    pnr_rows = []
    for fp in sorted(glob.glob(os.path.join(CLEAN_DIR, "pnr_*.csv"))):
        year = int(re.search(r'(\d{4})', os.path.basename(fp)).group(1))
        df = pd.read_csv(fp)

        c_state = find_col(df, "State")
        c_abbr  = find_col(df, "Abbreviation")
        c_ratio = find_col(df, "PNR", "Ratio", "PrEP-to-Need", "Need")

        for _, row in df.iterrows():
            state = row[c_state] if c_state else None
            if not state or str(state).strip() in ('', 'nan', 'None'):
                continue
            pnr_rows.append((
                year, str(state).strip(),
                str(row[c_abbr] if c_abbr else '').strip(),
                safe_float(row[c_ratio] if c_ratio else None),
            ))
        print(f"  ✓ pnr_{year}.csv — {len(df)} rows")

    cur.executemany(
        "INSERT INTO pnr_state VALUES (NULL,%s,%s,%s,%s)",
        pnr_rows
    )
    print(f"   {len(pnr_rows)} PNR rows inserted")

    conn.commit()
    cur.close()
    conn.close()

    print(f"""
{'='*50}
🎉 Clean data loaded into MySQL successfully!
   diagnoses_state : {len(dx_rows)} rows
   prep_state      : {len(prep_rows)} rows
   pnr_state       : {len(pnr_rows)} rows

Open MySQL Workbench → hiv_dashboard → right-click
any table → Select Rows to verify.
{'='*50}
""")


if __name__ == "__main__":
    main()