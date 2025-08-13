from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from dateutil import parser

# ---- In-memory resolvers (no DB) ----
class _Resolver:
    def __init__(self, base: int):
        self.base = base
        self._map: Dict[str, int] = {}
        self._next = base

    def resolve_id(self, name: Optional[str]) -> Optional[int]:
        if not name:
            return None
        key = name.strip()
        if key == "":
            return None
        if key not in self._map:
            self._map[key] = self._next
            self._next += 1
        return self._map[key]

    def table(self) -> Dict[str, int]:
        return dict(self._map)

# ---- helpers ----
_D0 = Decimal("0")
_Q2 = Decimal("0.01")

def _D(x: Any) -> Decimal:
    if x is None:
        return _D0
    s = str(x).strip()
    if s == "":
        return _D0
    # "1.234,56" -> "1234.56"
    if s.count(",") and not s.count("."):
        s = s.replace(".", "").replace(",", ".")
    # "1,234.56" -> "1234.56"
    elif "," in s and "." in s:
        s = s.replace(",", "")
    try:
        return Decimal(s)
    except Exception:
        return _D0

def _date(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    try:
        return parser.parse(s).date().isoformat()
    except Exception:
        return None

def _status(amount: Decimal, paid: Decimal) -> str:
    if paid <= _D0:
        return "UNPAID"
    if paid < amount:
        return "PARTIALLY_PAID"
    if paid == amount:
        return "PAID"
    return "OVERPAID"

# ---- planning API ----
@dataclass
class Defaults:
    region_id: int = 1
    payment_type_id: int = 1
    budget_item_id: int = 1

def _aggregate_taxes(lines: List[Dict[str, Any]]) -> Dict[str, Decimal]:
    totals = {"KDV": _D0, "TEVKIFAT": _D0, "OTV": _D0, "OIV": _D0}
    for ln in lines or []:
        totals["KDV"]      += _D(ln.get("kdv_amount"))
        totals["TEVKIFAT"] += _D(ln.get("tevkifat_amount"))
        totals["OTV"]      += _D(ln.get("otv_amount"))
        totals["OIV"]      += _D(ln.get("oiv_amount"))
    # quantize 2hane
    for k in totals:
        totals[k] = totals[k].quantize(_Q2)
    return totals

def plan_one(
    record: Dict[str, Any],
    defaults: Defaults,
    *,
    acc_resolver: _Resolver,
    sup_resolver: _Resolver,
) -> Dict[str, Any]:
    amount = _D(record.get("amount")).quantize(_Q2)
    total_paid = _D(record.get("total_paid")).quantize(_Q2)
    remaining = (amount - total_paid).quantize(_Q2, rounding=ROUND_HALF_UP)

    exp_date = _date(record.get("date"))
    last_pay = _date(record.get("last_payment_date"))
    status = _status(amount, total_paid)

    account_name_id = acc_resolver.resolve_id(record.get("account_name"))
    supplier_id = sup_resolver.resolve_id(record.get("supplier"))

    taxes = _aggregate_taxes(record.get("lines") or [])

    plan = {
        "expense": {
            "invoice_number": record.get("invoice_number") or None,
            "invoice_name": record.get("invoice_name") or None,
            "description": record.get("invoice_name") or None,  # yoksa isim açıklama gibi
            "date": exp_date,
            "amount": str(amount),
            "remaining_amount": str(remaining),
            "status": status,
            "region_id": defaults.region_id,
            "payment_type_id": defaults.payment_type_id,
            "budget_item_id": defaults.budget_item_id,
            "account_name_id": account_name_id,
            "supplier_id": supplier_id,
        },
        "taxes": [
            {"tax_type": "KDV", "amount": str(taxes["KDV"])},
            {"tax_type": "TEVKIFAT", "amount": str(taxes["TEVKIFAT"])},
            {"tax_type": "OTV", "amount": str(taxes["OTV"])},
            {"tax_type": "OIV", "amount": str(taxes["OIV"])},
        ],
        "payment": (
            {
                "payment_amount": str(total_paid),
                "payment_date": last_pay or exp_date,
                "description": "Imported aggregate payment",
            }
            if total_paid > _D0
            else None
        ),
        "resolutions": {
            "account_name": {"name": record.get("account_name"), "fake_id": account_name_id},
            "supplier": {"name": record.get("supplier"), "fake_id": supplier_id},
        },
    }
    return plan

def plan_many(records: List[Dict[str, Any]], defaults: Defaults) -> Dict[str, Any]:
    acc = _Resolver(base=1000)
    sup = _Resolver(base=5000)
    plans: List[Dict[str, Any]] = []
    for rec in records:
        plans.append(plan_one(rec, defaults, acc_resolver=acc, sup_resolver=sup))
    return {
        "plans": plans,
        "account_name_map": acc.table(),
        "supplier_map": sup.table(),
    }
