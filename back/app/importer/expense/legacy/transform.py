# transform.py
from __future__ import annotations
from typing import List, Any, Tuple
from column_policy import build_projection

def apply_column_policy(headers: List[str], rows: List[List[Any]]) -> Tuple[List[str], List[List[Any]]]:
    """
    Policy'e göre kolonları filtreler ve isimlendirir.
    - headers: orijinal başlıklar
    - rows: list-of-lists (xlsx_reader.read_all çıktısı)
    Dönüş: (yeni_headers, projekte_rows)
    """
    col_idx, new_headers = build_projection(headers)
    proj_rows: List[List[Any]] = []
    for r in rows:
        proj_rows.append([r[i] if i < len(r) else None for i in col_idx])
    return new_headers, proj_rows
