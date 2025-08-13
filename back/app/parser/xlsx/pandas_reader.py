
# xlsx_reader.py
from __future__ import annotations
from typing import Tuple, List, Any

def read_all(path: str, sheet: str | None = None) -> Tuple[List[str], List[List[Any]]]:
    """
    Read the entire XLSX sheet and return (headers, rows) as raw Python objects.
    - No domain mapping, no validation, no filtering.
    - Keeps cell values as-is (pandas dtype=object).
    """
    try:
        import pandas as pd  # lazy import
    except ModuleNotFoundError as e:
        raise RuntimeError("pandas is required: pip install pandas openpyxl") from e

    # Read with openpyxl engine; keep raw objects
    df = pd.read_excel(path, sheet_name=sheet, engine="openpyxl", dtype=object)

    # Headers (as strings trimmed)
    headers = [("" if h is None else str(h)).strip() for h in list(df.columns)]

    # Rows as list of lists, aligned to headers
    rows: List[List[Any]] = []
    # itertuples is faster, but we want a plain list-of-lists:
    for _, row in df.iterrows():
        values = [row.get(col) for col in df.columns]
        rows.append(values)

    return headers, rows

