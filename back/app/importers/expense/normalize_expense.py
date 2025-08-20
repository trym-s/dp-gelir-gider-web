# app/importer/expense/normalize_expense.py
from __future__ import annotations
from typing import Any, List, Dict
from decimal import Decimal, InvalidOperation
from datetime import date, datetime
import pandas as pd

RENAME_MAP = {
    "Düzenleme tarihi": "date",
    "Tedarikçi / Çalışan": "supplier",
    "Fatura ismi": "invoice_name",
    "Kategori": "account_name",
    "Genel Toplam (TL)": "amount",
    "Toplam ödenen (TL)": "total_paid",
    "Fiş/Fatura No": "invoice_number",
    "Son ödemenin yapıldığı tarih": "last_payment_date",
    "Ürün/hizmet": "description",
    "Miktar": "quantity",
    "Birim fiyatı": "unit_price",
    "İndirim": "discount",
    "KDV Tutarı": "kdv_amount",
    "Tevkifat Tutarı": "tevkifat_amount",
    "ÖTV": "otv_amount",
    "ÖİV": "oiv_amount",
    "Ürün/hizmet Net Tutarı": "net_amount",
}

HEADER_KEYS = ["invoice_number","supplier","invoice_name","account_name","date","amount","total_paid","last_payment_date"]
LINE_KEYS = ["description","quantity","unit_price","discount","kdv_amount","tevkifat_amount","otv_amount","oiv_amount","net_amount"]

def _to_decimal(x: Any) -> Decimal | None:
    if x is None: return None
    s = str(x).strip()
    if s == "": return None
    if "," in s and "." in s: s = s.replace(",", "")
    elif "," in s and "." not in s: s = s.replace(".", "").replace(",", ".")
    try: return Decimal(s)
    except (InvalidOperation, ValueError): return None

def _to_iso_date(x: Any) -> str | None:
    if x is None or (isinstance(x, str) and x.strip() == ""): return None
    if isinstance(x, (datetime, date)): return (x.date() if isinstance(x, datetime) else x).isoformat()
    from dateutil import parser
    try: return parser.parse(str(x)).date().isoformat()
    except Exception: return None

def build_preview(path: str, sheet: str | int | None = 0) -> Dict[str, Any]:
    df = pd.read_excel(path, sheet_name=(0 if sheet is None else sheet), engine="openpyxl", dtype=object)
    df.columns = [("" if c is None else str(c)).strip() for c in df.columns]
    df = df.rename(columns=RENAME_MAP)

    # grup başı: başlık kolonlarından en az biri doluysa
    present = df[HEADER_KEYS].notna().any(axis=1)
    df["__is_new"] = present
    df["__gid"] = df["__is_new"].cumsum().replace(0, pd.NA).ffill().astype("Int64")

    # header alanlarını grup içinde ffill
    df[HEADER_KEYS] = df.groupby("__gid", dropna=False)[HEADER_KEYS].ffill()

    # line satırları
    lines = df.loc[df[LINE_KEYS].notna().any(axis=1), ["__gid"] + LINE_KEYS].copy()
    expenses = (
        df.dropna(subset=["__gid"])
          .drop_duplicates(["__gid"], keep="first")[["__gid"] + HEADER_KEYS]
          .reset_index(drop=True)
    )

    # build output
    out: list[dict] = []
    for _, e in expenses.iterrows():
        gid = int(e["__gid"])
        grp = lines[lines["__gid"] == gid]
        lns = []
        kdv = tevk = otv = oiv = Decimal("0")
        for _, r in grp.iterrows():
            item = {
                "description": (str(r.description).strip() if pd.notna(r.description) else None),
                "quantity": str(_to_decimal(r.quantity) or ""),
                "unit_price": str(_to_decimal(r.unit_price) or ""),
                "discount": str(_to_decimal(r.discount) or ""),
                "kdv_amount": str(_to_decimal(r.kdv_amount) or ""),
                "tevkifat_amount": str(_to_decimal(r.tevkifat_amount) or ""),
                "otv_amount": str(_to_decimal(r.otv_amount) or ""),
                "oiv_amount": str(_to_decimal(r.oiv_amount) or ""),
                "net_amount": str(_to_decimal(r.net_amount) or ""),
            }
            # totals
            if item["kdv_amount"]:      kdv  += Decimal(item["kdv_amount"])
            if item["tevkifat_amount"]: tevk += Decimal(item["tevkifat_amount"])
            if item["otv_amount"]:      otv  += Decimal(item["otv_amount"])
            if item["oiv_amount"]:      oiv  += Decimal(item["oiv_amount"])
            lns.append(item)

        out.append({
            "invoice_number": (str(e.invoice_number).strip() if pd.notna(e.invoice_number) else None),
            "invoice_name": (str(e.invoice_name).strip() if pd.notna(e.invoice_name) else None),
            "date": _to_iso_date(e.date),
            "supplier": (str(e.supplier).strip() if pd.notna(e.supplier) else None),
            "account_name": (str(e.account_name).strip() if pd.notna(e.account_name) else None),
            "amount": str(_to_decimal(e.amount) or ""),
            "total_paid": str(_to_decimal(e.total_paid) or ""),
            "last_payment_date": _to_iso_date(e.last_payment_date),
            "taxes": {
                "KDV": str(kdv),
                "TEVKIFAT": str(tevk),
                "OTV": str(otv),
                "OIV": str(oiv),
            },
            "lines": lns,
        })

    return {"count": len(out), "expenses": out}

