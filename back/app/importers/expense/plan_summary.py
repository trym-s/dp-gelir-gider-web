# app/importer/expense/plan_summary.py
from __future__ import annotations
from typing import Any, Dict, List, Tuple
from collections import Counter
from decimal import Decimal, InvalidOperation
from sqlalchemy import select, func
from app import db
from ...expense.models import Expense, Supplier, Payment
from app.account_name.models import AccountName
from .textnorm import norm_text

def _to_decimal(x: Any) -> Decimal:
    from decimal import Decimal as D
    if x is None: return D(0)
    s = str(x).strip()
    if s == "": return D(0)
    if "," in s and "." not in s: s = s.replace(".", "").replace(",", ".")
    elif "," in s and "." in s:   s = s.replace(",", "")
    try: return D(s)
    except (InvalidOperation, ValueError): return D(0)

def _names_and_counts(records: List[Dict[str, Any]], key: str) -> Tuple[Counter, List[str]]:
    names: List[str] = []
    for r in records:
        v = r.get(key)
        if not v: continue
        s = str(v).strip()
        if s: names.append(s)
    return Counter(names), names

def _supplier_cache() -> Dict[str, int]:
    rows = db.session.execute(select(Supplier.id, Supplier.name)).all()
    return { norm_text(name): sid for sid, name in rows }

def _account_cache() -> Dict[tuple[int, str], int]:
    rows = db.session.execute(select(AccountName.id, AccountName.name, AccountName.payment_type_id)).all()
    m: Dict[tuple[int,str], int] = {}
    for aid, name, ptid in rows:
        m[(int(ptid) if ptid is not None else -1, norm_text(name))] = int(aid)
    return m

def _fetch_existing_expenses(inv_nums: List[str]) -> Dict[str, Dict[str, Any]]:
    if not inv_nums: return {}
    q = (
        select(
            Expense.id, Expense.invoice_number, Expense.amount, Expense.status,
            func.coalesce(
                select(func.sum(Payment.payment_amount))
                .where(Payment.expense_id == Expense.id)
                .scalar_subquery(), 0
            ).label("total_paid")
        )
        .where(Expense.invoice_number.in_(inv_nums))
    )
    out: Dict[str, Dict[str, Any]] = {}
    for row in db.session.execute(q):
        _id, inv, amt, st, paid = row
        out[str(inv)] = {
            "id": _id,
            "amount": Decimal(str(amt or 0)),
            "paid": Decimal(str(paid or 0)),
            "status": str(getattr(st, "name", st) or ""),
        }
    return out

def build_plan_summary(
    records: List[Dict[str, Any]],
    *,
    allow_negative_adjustment: bool = False,
    simulate_amount_update: bool = False,
    default_payment_type_id: Optional[int] = None,
) -> Dict[str, Any]:
    total_amount = sum(_to_decimal(r.get("amount")) for r in records)
    total_paid   = sum(_to_decimal(r.get("total_paid")) for r in records)

    inv_nums = [str(r.get("invoice_number")).strip() for r in records if r.get("invoice_number")]
    from collections import Counter as _C
    dup_in_selection = sorted([n for n, c in _C(inv_nums).items() if c > 1])

    existing_map = _fetch_existing_expenses(inv_nums)
    existing_in_db = list(existing_map.keys())

    sup_cache = _supplier_cache()
    acc_cache = _account_cache()

    # ---- Suppliers (new vs existing) — normalized compare
    supplier_counts, _supplier_names_raw = _names_and_counts(records, "supplier")
    suppliers_existing: List[Dict[str, Any]] = []
    suppliers_new: List[Dict[str, Any]] = []
    for name, cnt in supplier_counts.items():
        key = norm_text(name)
        sid = sup_cache.get(key)
        if sid:
            suppliers_existing.append({"id": sid, "name": name, "count": cnt})
        else:
            suppliers_new.append({"name": name, "count": cnt})

    # ---- Accounts (by payment_type) — PTID'i dikkate al
    accounts_existing: List[Dict[str, Any]] = []
    accounts_new: List[Dict[str, Any]] = []

    acc_counts, acc_names_raw = _names_and_counts(records, "account_name")

    def _candidate_ptids_for(name: str) -> List[int]:
        pts: List[int] = []
        if default_payment_type_id is not None:
            pts.append(int(default_payment_type_id))
        # aynı isim için kayıtlarda gelen ptid'leri de dene
        name_cf = (name or "").strip().casefold()
        for r in records:
            if (r.get("account_name") or "").strip().casefold() == name_cf:
                pid = r.get("payment_type_id") or r.get("payment_type")
                if pid is not None:
                    p = int(pid)
                    if p not in pts:
                        pts.append(p)
        # hi̇ç biri bulunamazsa -1 anahtarı da bir şans
        return pts or [-1]

    for name, cnt in acc_counts.items():
        if not (name or "").strip():
            continue
        found = False
        for ptid in _candidate_ptids_for(name):
            key = (int(ptid) if ptid is not None else -1, norm_text(name))
            aid = acc_cache.get(key)
            if aid:
                accounts_existing.append({"id": aid, "name": name, "count": cnt})
                found = True
                break
        if not found:
            accounts_new.append({"name": name, "count": cnt})

    # ---- Effects: mevcut faturalara ödeme delta projeksiyonu (kısa)
    existing_effects: List[Dict[str, Any]] = []
    from decimal import Decimal as D
    for r in records:
        inv = (r.get("invoice_number") or "").strip()
        if not inv or inv not in existing_map:
            continue
        ex = existing_map[inv]
        sel_amt  = _to_decimal(r.get("amount"))
        sel_paid = _to_decimal(r.get("total_paid"))
        delta    = max(D(0), sel_paid - ex["paid"]) if not allow_negative_adjustment else sel_paid - ex["paid"]
        proj_amt = sel_amt if simulate_amount_update and sel_amt > 0 else ex["amount"]
        proj_fin = ex["paid"] + delta
        existing_effects.append({
            "invoice_number": inv,
            "expense_id": ex["id"],
            "delta_payment": float(delta),
            "projected_final_paid": float(proj_fin),
            "projected_amount": float(proj_amt),
        })

    # ---- Issues / Summary extras
    missing_account_count = sum(1 for r in records if not (r.get("account_name") or "").strip())
    unmapped_accounts = sorted({ it["name"] for it in accounts_new if (it.get("name") or "").strip() })

    return {
        "summary": {
            "invoices_selected": len(records),
            "total_amount": float(total_amount),
            "total_paid": float(total_paid),
            "duplicate_invoice_numbers": dup_in_selection,
            "existing_invoice_numbers_in_db": existing_in_db,
            "missing_account_count": int(missing_account_count),
        },
        "entities": {
            "suppliers": {"new": suppliers_new, "existing": suppliers_existing},
            "accounts":  {"new": accounts_new, "existing": accounts_existing},
        },
        "issues": {
            "unmapped_accounts": unmapped_accounts,
            "missing_invoice_numbers": sum(1 for r in records if not r.get("invoice_number")),
        },
        "effects": {"existing_invoices": existing_effects},
    }
def _resolve_account_and_budget(
    records: List[Dict[str, Any]],
    region_id: int,
    payment_type_id: int | None,
    default_budget_item_id: int | None,
    catalog: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Her kayıt için:
      - account_name (string) -> account_id (aynı payment_type altında tekil eşleşme varsa)
      - budget_item -> varsayılan veya mevcut item, hiyerarşiye uygun mu?
    Döner:
      {
        "resolved": [{index, invoice_number, account_id, budget_item_id}],
        "ambiguous_accounts": [{index, name, candidates:[{id,name}]}],
        "missing_accounts": [{index, name}],
        "invalid_budget_items": [{index, budget_item_id, reason}],
        "summary": { resolved_count, ambiguous_count, missing_count, invalid_budget_count }
      }
    """
    acc_by_pt = catalog.get("accounts_by_payment_type", {}) or {}
    buds_by_acc = catalog.get("budget_items_by_account", {}) or {}

    resolved: List[Dict[str, Any]] = []
    ambiguous: List[Dict[str, Any]] = []
    missing: List[Dict[str, Any]] = []
    invalid_b: List[Dict[str, Any]] = []

    for idx, r in enumerate(records):
        inv = (r.get("invoice_number") or "").strip()
        acc_name_raw = (r.get("account_name") or "").strip()
        acc_name_key = norm_text(acc_name_raw)

        # payment_type_id: param öncelikli; yoksa kayıttaki (varsa) kullan
        ptid = payment_type_id
        if ptid is None:
            ptid = r.get("payment_type_id") or r.get("payment_type")
        # PT olmadan doğru eşleşme garanti değil → ambiguous say
        if not ptid:
            ambiguous.append({"index": idx, "name": acc_name_raw, "candidates": []})
            resolved.append({"index": idx, "invoice_number": inv, "account_id": None, "budget_item_id": None})
            continue

        # Bu PT altındaki tüm hesap adayları
        candidates_all = acc_by_pt.get(int(ptid), [])
        # İsim normalize ederek birebir eşleşen adaylar
        eq_candidates = [a for a in candidates_all if norm_text(a.get("name")) == acc_name_key] if acc_name_raw else []

        if acc_name_raw and len(eq_candidates) == 1:
            acc_id = int(eq_candidates[0]["id"])
        elif acc_name_raw and len(eq_candidates) > 1:
            # Çok eşleşme: kullanıcı seçimi gerek
            ambiguous.append({
                "index": idx,
                "name": acc_name_raw,
                "candidates": [{"id": int(a["id"]), "name": a.get("name")} for a in eq_candidates],
            })
            resolved.append({"index": idx, "invoice_number": inv, "account_id": None, "budget_item_id": None})
            continue
        elif acc_name_raw and len(eq_candidates) == 0:
            # İsim var ama bu PT altında hiç yok → yeni oluşturulacak ya da kullanıcı seçmeli
            missing.append({"index": idx, "name": acc_name_raw})
            acc_id = None
        else:
            # İsim hiç gelmemiş
            missing.append({"index": idx, "name": ""})
            acc_id = None

        # Budget item doğrulama (varsayılan id verilmişse ve account_id belirliyse)
        bud_id = None
        if default_budget_item_id and acc_id:
            acc_buds = buds_by_acc.get(acc_id, [])
            if any(int(b.get("id")) == int(default_budget_item_id) for b in acc_buds):
                bud_id = int(default_budget_item_id)
            else:
                invalid_b.append({
                    "index": idx,
                    "budget_item_id": int(default_budget_item_id),
                    "reason": "Budget item seçilen account altında değil",
                })

        resolved.append({
            "index": idx,
            "invoice_number": inv,
            "account_id": acc_id,      # None ise UI override/commit sırasında oluşturulur/seçilir
            "budget_item_id": bud_id,  # None ise default veya kullanıcı seçimi gerekir
        })

    return {
        "resolved": resolved,
        "ambiguous_accounts": ambiguous,
        "missing_accounts": missing,
        "invalid_budget_items": invalid_b,
        "summary": {
            "resolved_count": len([x for x in resolved if x["account_id"] is not None]),
            "ambiguous_count": len(ambiguous),
            "missing_count": len(missing),
            "invalid_budget_count": len(invalid_b),
        }
    }
