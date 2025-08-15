
# xlsx_reader.py
from __future__ import annotations
from typing import Tuple, List, Any

def read_all(path: str, sheet: str | int | None = None) -> Tuple[List[str], List[List[Any]]]:
    """
    Read the entire XLSX sheet and return (headers, rows) as raw Python objects.
    - No mapping/validation.
    - dtype=object keeps raw cell values as-is.
    """
    try:
        import pandas as pd
    except ModuleNotFoundError as e:
        raise RuntimeError("pandas is required: pip install pandas openpyxl") from e

    sheet_arg = 0 if sheet is None else sheet
    df = pd.read_excel(path, sheet_name=sheet_arg, engine="openpyxl", dtype=object)

    headers = [("" if h is None else str(h)).strip() for h in list(df.columns)]
    rows: List[List[Any]] = []
    for _, row in df.iterrows():
        rows.append([row.get(col) for col in df.columns])
    return headers, rows

