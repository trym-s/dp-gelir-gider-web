# importer/expense/xlsx_pipeline.py
from __future__ import annotations
from typing import Dict, Any
from .pandas_reader import read_rows
from .mapping import build_index_map, matched_aliases
from .validators import parse_row  # -> (DTO | None, error | None)

def preview(path: str, sheet: str | None = None, limit: int = 200) -> Dict[str, Any]:
    """
    Read XLSX and return a preview payload (no DB writes).
    """
    headers = None
    mapped: dict[str, int] = {}
    matched: dict[str, list[str]] = {}
    records: list[dict] = []
    errors: list[dict] = []
    total = valid = invalid = 0
    sum_amount = 0.0

    rownum = 1  # header satırı 1, ilk data 2
    for hdrs, raw in read_rows(path=path, sheet=sheet):
        if headers is None:
            headers = hdrs
            mapped = build_index_map(headers)
            matched = matched_aliases(headers)
            rownum = 2

        total += 1
        dto, err = parse_row(raw, mapped)
        if err:
            invalid += 1
            if len(errors) < 500:
                errors.append({"row": rownum, "error": err})
        else:
            valid += 1
            if len(records) < limit:
                records.append(dto.to_dict())
            try:
                # Decimal -> float str toplamı
                sum_amount += float(dto.amount)
            except Exception:
                pass

        rownum += 1

    return {
        "headers": headers or [],
        "mapped_fields": mapped,
        "matched_aliases": matched,
        "records": records,
        "errors": errors,
        "stats": {
            "total_rows": total,
            "valid": valid,
            "invalid": invalid,
            "sum_amount": f"{sum_amount:.2f}",
        },
    }
