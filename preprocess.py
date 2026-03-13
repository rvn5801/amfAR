import os
import re
import glob
import pandas as pd

DATA_DIR    = os.path.join(os.path.dirname(__file__), "data")
CLEAN_DIR   = os.path.join(os.path.dirname(__file__), "data", "clean")
os.makedirs(CLEAN_DIR, exist_ok=True)


def get_year(filename):
    m = re.search(r'(\d{4})', filename)
    return m.group(1) if m else "unknown"


def get_type(filename):
    name = filename.upper()
    if "NEWDX" in name or "NEWDX" in name.replace("_", ""):
        return "newdx"
    if "PREP" in name and "PNR" not in name:
        return "prep"
    if "PNR" in name:
        return "pnr"
    return "unknown"


def clean_xlsx(filepath):
    """
    Read first sheet only, skip rows until we find the real header row.
    Real header row is identified by containing 'Year' or 'GEO' in first cell.
    """
    xl = pd.ExcelFile(filepath)
    # Always use first sheet (ignore 'Data Methods')
    sheet = xl.sheet_names[0]
    
    # Read raw without header to find header row
    raw = pd.read_excel(filepath, sheet_name=sheet, header=None)
    
    header_row = None
    for i, row in raw.iterrows():
        first_cell = str(row.iloc[0]).strip().replace('\n', ' ')
        if first_cell in ('Year', 'GEO ID', 'GEOID') or 'GEO' in first_cell:
            header_row = i
            break
    
    if header_row is None:
        print(f"  ⚠ Could not find header in {os.path.basename(filepath)}")
        return None

    # Re-read with correct header
    df = pd.read_excel(filepath, sheet_name=sheet, header=header_row)
    
    # Clean column names — remove newlines, extra spaces
    df.columns = [str(c).replace('\n', ' ').replace('  ', ' ').strip() for c in df.columns]
    
    # Drop fully empty rows
    df = df.dropna(how='all')
    
    # Drop rows where first column is NaN or metadata-like
    first_col = df.columns[0]
    df = df[df[first_col].notna()]
    df = df[~df[first_col].astype(str).str.contains('For additional|click|visit|http', case=False, na=False)]
    
    return df


def main():
    xlsx_files = glob.glob(os.path.join(DATA_DIR, "AIDSVu_State_*.xlsx"))
    
    if not xlsx_files:
        print(f"No XLSX files found in {DATA_DIR}")
        return
    
    print(f"Found {len(xlsx_files)} files\n")
    
    summary = {"newdx": [], "prep": [], "pnr": [], "unknown": []}
    
    for fp in sorted(xlsx_files):
        fname = os.path.basename(fp)
        year  = get_year(fname)
        ftype = get_type(fname)
        
        df = clean_xlsx(fp)
        if df is None:
            continue
        
        # Save as clean CSV
        out_name = f"{ftype}_{year}.csv"
        out_path = os.path.join(CLEAN_DIR, out_name)
        df.to_csv(out_path, index=False)
        
        summary[ftype].append(year)
        print(f"  ✓ {fname}")
        print(f"    → {out_name} | {len(df)} rows × {len(df.columns)} cols")
        print(f"    Columns: {list(df.columns[:6])}{'...' if len(df.columns) > 6 else ''}")
        print()
    
    print("=" * 60)
    print(f"Clean files saved to: {CLEAN_DIR}")
    print(f"  newdx: {sorted(summary['newdx'])}")
    print(f"  prep:  {sorted(summary['prep'])}")
    print(f"  pnr:   {sorted(summary['pnr'])}")
    print(f"\n Done. Run seed_db_clean.py next to load into MySQL.")


if __name__ == "__main__":
    main()