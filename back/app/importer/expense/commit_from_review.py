
# app/importer/expense/commit_from_review.py
from __future__ import annotations

import logging, traceback
from typing import Any, Dict, List, Tuple, Optional
from decimal import Decimal, InvalidOperation
from datetime import date

from dateutil import parser
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app import db
from ...expense.models import (
    Expense, ExpenseTax, Payment,
    ExpenseStatus, TaxType, Supplier, ExpenseLine
)
from app.account_name.models import AccountName
from .textnorm import norm_text

# helper: bu gider için son ödeme tarihini çek
def _max_payment_date_for(expense_id: int) -> Optional[date]:
    return db.session.query(func.max(Payment.payment_date))\
        .filter(Payment.expense_id == expense_id).scalar()


# -----------------------------------------------------------------------------
# logging
# -----------------------------------------------------------------------------
log = logging.getLogger(__name__)
if not log.handlers:
    log.setLevel(logging.INFO)

_Q2 = Decimal("0.01")
_D0 = Decimal("0")
MAX_INV_NAME = 255

# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------
def _D(x: Any) -> Decimal:
    if x is None: return _D0
    s = str(x).strip().replace(" ", "")
    if s == "": return _D0
    if "," in s and "." not in s: s = s.replace(".", "").replace(",", ".")
    elif "," in s and "." in s:   s = s.replace(",", "")
    try: return Decimal(s)
    except (InvalidOperation, ValueError): return _D0

def _date(s: Optional[str]) -> Optional[date]:
    if not s: return None
    try: return parser.parse(s).date()
    except Exception: return None

def _status(amount: Decimal, paid: Decimal) -> ExpenseStatus:
    if paid <= _D0: return ExpenseStatus.UNPAID
    if paid < amount: return ExpenseStatus.PARTIALLY_PAID
    if paid == amount: return ExpenseStatus.PAID
    return ExpenseStatus.OVERPAID

def _clip(s: Optional[str], n: int) -> Optional[str]:
    if s is None: return None
    s = str(s)
    return s[:n] if len(s) > n else s

def _safe_lines(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    ls = record.get("lines")
    if not isinstance(ls, list): return []
    return [ln for ln in ls if isinstance(ln, dict)]

# -----------------------------------------------------------------------------
# caches
# -----------------------------------------------------------------------------
def _build_supplier_cache(session) -> Dict[str, int]:
    rows = session.execute(select(Supplier.id, Supplier.name)).all()
    m = { norm_text(name): int(sid) for sid, name in rows }
    log.debug("supplier_cache=%s", len(m)); return m

def _build_account_cache(session) -> Dict[tuple[int, str], int]:
    rows = session.execute(select(AccountName.id, AccountName.name, AccountName.payment_type_id)).all()
    m: Dict[tuple[int,str], int] = {}
    for aid, name, ptid in rows:
        m[(int(ptid) if ptid is not None else -1, norm_text(name))] = int(aid)
    log.debug("account_cache=%s", len(m)); return m

# -----------------------------------------------------------------------------
# lookups
# -----------------------------------------------------------------------------
def _sum_payments(expense_id: int) -> Decimal:
    total = db.session.query(func.coalesce(func.sum(Payment.payment_amount), 0)).filter(Payment.expense_id == expense_id).scalar()
    try: d = Decimal(total)
    except Exception: d = _D(total)
    return d.quantize(_Q2)

def _find_expense_by_invoice(inv: Optional[str]) -> Optional[Expense]:
    invn = (inv or "").strip()
    if not invn: return None
    return db.session.query(Expense).filter(Expense.invoice_number == invn).first()

# -----------------------------------------------------------------------------
# ensure (override-aware)
# -----------------------------------------------------------------------------
def _ensure_account_name(session, name: Optional[str], *, payment_type_id: Optional[int],
                         acc_cache: Dict[tuple[int, str], int], override_id: Optional[int] = None) -> Tuple[Optional[int], bool]:
    if override_id: return int(override_id), False
    if not name:    return None, False
    key = (int(payment_type_id) if payment_type_id is not None else -1, norm_text(name))
    hit = acc_cache.get(key)
    if hit: return int(hit), False
    obj = AccountName(name=name.strip(), payment_type_id=payment_type_id)
    session.add(obj); session.flush()
    acc_cache[key] = obj.id
    log.info("account_created id=%s name=%s ptid=%s", obj.id, name, payment_type_id)
    return int(obj.id), True

def _ensure_supplier(session, name: Optional[str], *, sup_cache: Dict[str, int],
                     override_id: Optional[int] = None) -> Tuple[Optional[int], bool]:
    if override_id: return int(override_id), False
    if not name:    return None, False
    key = norm_text(name)
    hit = sup_cache.get(key)
    if hit: return int(hit), False
    obj = Supplier(name=name.strip())
    session.add(obj); session.flush()
    sup_cache[key] = obj.id
    log.info("supplier_created id=%s name=%s", obj.id, name)
    return int(obj.id), True

# -----------------------------------------------------------------------------
# taxes
# -----------------------------------------------------------------------------
def _aggregate_taxes(lines: List[Dict[str, Any]]) -> Dict[TaxType, Decimal]:
    totals = {TaxType.KDV:_D0, TaxType.TEVKIFAT:_D0, TaxType.OTV:_D0, TaxType.OIV:_D0}
    for ln in lines or []:
        totals[TaxType.KDV]      += _D(ln.get("kdv_amount"))
        totals[TaxType.TEVKIFAT] += _D(ln.get("tevkifat_amount"))
        totals[TaxType.OTV]      += _D(ln.get("otv_amount"))
        totals[TaxType.OIV]      += _D(ln.get("oiv_amount"))
    for k in totals: totals[k] = totals[k].quantize(_Q2)
    return totals

# -----------------------------------------------------------------------------
# overrides
# -----------------------------------------------------------------------------
def _apply_overrides_to_record(record: Dict[str, Any], ov: Dict[str, Any]) -> None:
    if not ov: return
    if ov.get("supplier_name"): record["supplier"] = ov["supplier_name"]
    if ov.get("account_name"):  record["account_name"] = ov["account_name"]
    if ov.get("total_paid") is not None: record["total_paid"] = ov["total_paid"]
    if ov.get("last_payment_date"):     record["last_payment_date"] = ov["last_payment_date"]

def _validate_record(rec: Dict[str, Any]) -> List[str]:
    errs: List[str] = []
    if not (rec.get("invoice_number") or "").strip():
        errs.append("invoice_number is required")
    if _D(rec.get("amount")) <= _D0:
        errs.append("amount must be > 0")
    return errs

# -----------------------------------------------------------------------------
# core
# -----------------------------------------------------------------------------
def commit_one_record_upsert(
    record: Dict[str, Any],
    *,
    region_id: int = 1,
    payment_type_id: Optional[int] = 1,
    budget_item_id: Optional[int] = 1,
    allow_negative_adjustment: bool = False,
    update_amount_if_changed: bool = True,
    update_taxes_on_upsert: bool = False,
    caches: Optional[Dict[str, Any]] = None,
    overrides_for_invoice: Optional[Dict[str, Any]] = None,
) -> Tuple[int, List[int], List[int], List[int], Dict[str, Any]]:

    ov = overrides_for_invoice or {}
    _apply_overrides_to_record(record, ov)

    amount = _D(record.get("amount")).quantize(_Q2)
    new_total_paid = _D(record.get("total_paid")).quantize(_Q2)
    exp_date = _date(record.get("date"))
    last_payment_date = _date(record.get("last_payment_date"))
    invoice_number = (record.get("invoice_number") or "").strip() or None
    inv_name = _clip(record.get("invoice_name") or None, MAX_INV_NAME)

    v = _validate_record(record)
    if v: raise ValueError("; ".join(v))

    if caches is None:
        caches = {"suppliers": _build_supplier_cache(db.session),
                  "accounts":  _build_account_cache(db.session)}
    sup_cache: Dict[str,int] = caches["suppliers"]
    acc_cache: Dict[tuple[int,str],int] = caches["accounts"]

    log.info("upsert.begin inv=%s amount=%s total_paid=%s", invoice_number, amount, new_total_paid)

    try:
        # -------- find or create expense --------
        exp = _find_expense_by_invoice(invoice_number)

        if exp is None:
            # Create path
            if ov.get("account_id") and ov.get("account_name"):
                log.warning("override both account_id & account_name, id takes precedence (inv=%s)", invoice_number)
            if ov.get("supplier_id") and ov.get("supplier_name"):
                log.warning("override both supplier_id & supplier_name, id takes precedence (inv=%s)", invoice_number)

            acc_id, _acc_new = _ensure_account_name(
                db.session, record.get("account_name"),
                payment_type_id=payment_type_id, acc_cache=acc_cache, override_id=ov.get("account_id"),
            )
            sup_id, _sup_new = _ensure_supplier(
                db.session, record.get("supplier"),
                sup_cache=sup_cache, override_id=ov.get("supplier_id"),
            )

            remaining = (amount - new_total_paid).quantize(_Q2)
            status = _status(amount, new_total_paid)

            lines_in = _safe_lines(record)
            desc = (lines_in[0].get("description") if lines_in else None) or inv_name

            exp = Expense(
                invoice_number=invoice_number,
                invoice_name=inv_name,
                description=desc,
                date=exp_date,
                amount=amount,
                remaining_amount=remaining,
                status=status,
                region_id=region_id,
                payment_type_id=payment_type_id,
                budget_item_id=budget_item_id,
                account_name_id=acc_id,
                supplier_id=sup_id,
            )
            db.session.add(exp)
            db.session.flush()  # id gelsin (unique invoice_number burada patlar)

            # Lines
            line_ids: List[int] = []
            for ln in lines_in:
                line = ExpenseLine(
                    expense_id=exp.id,
                    item_name=ln.get("description"),
                    quantity=_D(ln.get("quantity")),
                    unit_price=_D(ln.get("unit_price")),
                    discount=_D(ln.get("discount")),
                    kdv_amount=_D(ln.get("kdv_amount")),
                    tevkifat_amount=_D(ln.get("tevkifat_amount")),
                    otv_amount=_D(ln.get("otv_amount")),
                    oiv_amount=_D(ln.get("oiv_amount")),
                    net_amount_try=_D(ln.get("net_amount")),
                )
                db.session.add(line); db.session.flush()
                line_ids.append(line.id)

            # Taxes
            tax_ids: List[int] = []
            for ttype, amt in _aggregate_taxes(lines_in).items():
                if amt != _D0:
                    db.session.add(ExpenseTax(expense_id=exp.id, tax_type=ttype, amount=amt)); db.session.flush()
                    tax_ids.append(db.session.query(ExpenseTax.id).order_by(ExpenseTax.id.desc()).first()[0])

            # Payment (varsa)
            pay_ids: List[int] = []
            action = "created"
            created_payment_date: Optional[date] = None  # <-- NEW

            if new_total_paid > _D0:
                pdate = last_payment_date or exp_date
                if not pdate:
                    raise ValueError("payment_date required (last_payment_date or date)")
                p = Payment(
                    expense_id=exp.id,
                    payment_amount=new_total_paid,
                    payment_date=pdate,
                    description="Imported aggregate payment",
                )
                db.session.add(p); db.session.flush()
                pay_ids.append(p.id)
                created_payment_date = pdate         # <-- NEW
                action = "created_with_payment"

            # final total / status
            final_paid = new_total_paid
            exp.remaining_amount = (amount - final_paid).quantize(_Q2)
            exp.status = _status(amount, final_paid)

            # --- NEW: completed_at ataması ---
            if exp.status == ExpenseStatus.PAID or exp.remaining_amount <= _D0:
                # yeni ödeme varsa onu kullan; yoksa DB’deki max(payment_date)
                exp.completed_at = created_payment_date or _max_payment_date_for(exp.id) or exp.date

            db.session.commit()
            meta = {
                "invoice_number": invoice_number, "expense_id": exp.id,
                "action": action,
                "delta_payment": float(new_total_paid), "final_paid": float(new_total_paid),
                "remaining_amount": float(remaining),
                "final_status": (exp.status.name if hasattr(exp.status,"name") else str(exp.status)),
                "used_override_supplier": bool(ov.get("supplier_id") or ov.get("supplier_name")),
                "used_override_account":  bool(ov.get("account_id")  or ov.get("account_name")),
            }
            log.info("upsert.created inv=%s exp_id=%s", invoice_number, exp.id)
            return exp.id, tax_ids, pay_ids, line_ids, meta

        # -------- upsert/delta path --------
        if update_amount_if_changed and amount != (exp.amount or _D0).quantize(_Q2):
            log.info("amount_update inv=%s from=%s to=%s", invoice_number, exp.amount, amount)
            exp.amount = amount

        existing_total_paid = _sum_payments(exp.id)
        delta = (new_total_paid - existing_total_paid).quantize(_Q2)

        pay_ids: List[int] = []
        action = "noop"
        # hangi tarihte ödeme yazdık? (delta>0 ya da <0 durumunda set ediliyor)
        wrote_payment_date: Optional[date] = None  # <-- NEW
        if delta > _D0:
            pdate = last_payment_date or exp_date
            if not pdate:
                raise ValueError("payment_date required for delta upsert")
            p = Payment(
                expense_id=exp.id, payment_amount=delta, payment_date=pdate,
                description=f"Imported delta payment (from {existing_total_paid} to {new_total_paid})",
            )
            db.session.add(p); db.session.flush()
            pay_ids.append(p.id)
            wrote_payment_date = pdate              # <-- NEW
            action = "delta_payment"
        elif delta < _D0:
            if not allow_negative_adjustment:
                raise ValueError(
                    f"Incoming total_paid ({new_total_paid}) < known total ({existing_total_paid}); "
                    f"set allow_negative_adjustment=True to record a negative adjustment."
                )
            pdate = last_payment_date or exp_date
            if not pdate:
                raise ValueError("payment_date required for negative adjustment")
            p = Payment(
                expense_id=exp.id, payment_amount=delta, payment_date=pdate,
                description="Imported negative adjustment",
            )
            db.session.add(p); db.session.flush()
            pay_ids.append(p.id)
            wrote_payment_date = pdate              # <-- NEW
            action = "negative_adjustment"

        # override ile mevcut bağları düzelt
        if ov.get("account_id"):  exp.account_name_id = int(ov["account_id"])
        if ov.get("supplier_id"): exp.supplier_id     = int(ov["supplier_id"])

        # (opsiyonel) lines/taxes replace
        rec_lines = _safe_lines(record)
        if update_taxes_on_upsert and rec_lines:
            for t in list(exp.taxes): db.session.delete(t)
            for l in list(exp.lines): db.session.delete(l)
            db.session.flush()
            for ttype, amt in _aggregate_taxes(rec_lines).items():
                if amt != _D0: db.session.add(ExpenseTax(expense_id=exp.id, tax_type=ttype, amount=amt))
            for ln in rec_lines:
                db.session.add(ExpenseLine(
                    expense_id=exp.id,
                    item_name=ln.get("description"),
                    quantity=_D(ln.get("quantity")),
                    unit_price=_D(ln.get("unit_price")),
                    discount=_D(ln.get("discount")),
                    kdv_amount=_D(ln.get("kdv_amount")),
                    tevkifat_amount=_D(ln.get("tevkifat_amount")),
                    otv_amount=_D(ln.get("otv_amount")),
                    oiv_amount=_D(ln.get("oiv_amount")),
                    net_amount_try=_D(ln.get("net_amount")),
                ))
            db.session.flush()
            log.info("lines_taxes_replaced inv=%s", invoice_number)

        # final total ve status
        final_paid = new_total_paid
        exp.remaining_amount = ((exp.amount or _D0) - final_paid).quantize(_Q2)
        exp.status = _status(exp.amount or _D0, final_paid)

        # --- NEW: completed_at ataması ---
        if exp.status == ExpenseStatus.PAID or exp.remaining_amount <= _D0:
            # yeni yazılan ödeme tarihi varsa onu kullan, yoksa mevcut max ödeme tarihi
            exp.completed_at = wrote_payment_date or _max_payment_date_for(exp.id) or exp.date
        else:
            # İstersen tam tersine döndüğünde temizlemek için aç:
            # exp.completed_at = None
            pass

        db.session.commit()
        meta = {
            "invoice_number": invoice_number, "expense_id": exp.id, "action": action,
            "delta_payment": float(delta), "final_paid": float(final_paid),
            "remaining_amount": float(exp.remaining_amount or _D0),
            "final_status": (exp.status.name if hasattr(exp.status,"name") else str(exp.status)),
            "used_override_supplier": bool(ov.get("supplier_id") or ov.get("supplier_name")),
            "used_override_account":  bool(ov.get("account_id")  or ov.get("account_name")),
        }
        log.info("upsert.done inv=%s exp_id=%s action=%s", invoice_number, exp.id, action)
        return exp.id, [t.id for t in exp.taxes], pay_ids, [l.id for l in exp.lines], meta

    except IntegrityError as ie:
        db.session.rollback()
        log.error("upsert.integrity inv=%s err=%s", invoice_number, str(ie))
        raise
    except Exception as e:
        db.session.rollback()
        log.error("upsert.error inv=%s err=%s\n%s", invoice_number, str(e), traceback.format_exc())
        raise

# -----------------------------------------------------------------------------
# bulk
# -----------------------------------------------------------------------------
def commit_many(
    records: List[Dict[str, Any]],
    *,
    region_id: int = 1,
    payment_type_id: Optional[int] = 1,
    budget_item_id: Optional[int] = 1,
    allow_negative_adjustment: bool = False,
    update_amount_if_changed: bool = True,
    update_taxes_on_upsert: bool = False,
    overrides: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    total = len(records or [])
    log.info("commit_many.begin total=%s", total)

    ok = 0; ids: List[int] = []; errs: List[Dict[str, Any]] = []; results: List[Dict[str, Any]] = []

    caches = {"suppliers": _build_supplier_cache(db.session), "accounts": _build_account_cache(db.session)}
    ov_map: Dict[str, Dict[str, Any]] = {}
    for ov in (overrides or []):
        inv = (ov.get("invoice_number") or "").strip()
        if inv: ov_map[inv] = ov

    for i, rec in enumerate(records or [], start=1):
        inv = (rec.get("invoice_number") or "").strip()
        try:
            exp_id, tax_ids, pay_ids, line_ids, meta = commit_one_record_upsert(
                rec,
                region_id=region_id,
                payment_type_id=payment_type_id,
                budget_item_id=budget_item_id,
                allow_negative_adjustment=allow_negative_adjustment,
                update_amount_if_changed=update_amount_if_changed,
                update_taxes_on_upsert=update_taxes_on_upsert,
                caches=caches,
                overrides_for_invoice=ov_map.get(inv),
            )
            ids.append(exp_id); results.append(meta); ok += 1
        except ValueError as e:
            msg = str(e)
            hints = (["Provide last_payment_date or date for payment creation."] if "payment_date required" in msg else
                     ["Set allow_negative_adjustment=True or fix total_paid."] if "allow_negative_adjustment" in msg else
                     ["Ensure amount > 0."] if "amount must be > 0" in msg else
                     ["Invoice number cannot be empty."] if "invoice_number is required" in msg else [])
            errs.append({"index": i, "invoice_number": inv or None, "code": "VALIDATION_ERROR", "message": msg, "hints": hints})
        except IntegrityError as e:
            # Nested TX yok; rollback zaten commit_one içinde yapıldı. Yine de güvenli olsun:
            try: db.session.rollback()
            except Exception: pass
            errs.append({"index": i, "invoice_number": inv or None, "code": "DB_INTEGRITY", "message": str(e)})
        except SQLAlchemyError as e:
            try: db.session.rollback()
            except Exception: pass
            errs.append({"index": i, "invoice_number": inv or None, "code": "DB_ERROR", "message": str(e)})
        except Exception as e:
            try: db.session.rollback()
            except Exception: pass
            errs.append({"index": i, "invoice_number": inv or None, "code": "UNKNOWN_ERROR", "message": str(e)})

    summary = {"inserted_or_upserted": ok, "total_processed": total, "failed": len(errs),
               "expense_ids": ids, "results": results, "errors": errs}
    log.info("commit_many.done ok=%s failed=%s", ok, len(errs))
    return summary

