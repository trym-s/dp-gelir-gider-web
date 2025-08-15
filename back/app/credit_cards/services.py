# app/credit_cards/services.py
from __future__ import annotations
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Union, Iterable

from sqlalchemy.orm import joinedload, aliased
from sqlalchemy import func

from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr

from .models import db, CreditCard, CreditCardTransaction, CardBrand, DailyCreditCardLimit
from app.payment_type.models import PaymentType
from app.banks.models import BankAccount, StatusHistory
from app.banks.services import save_status as generic_save_status

# -------------------------- helpers --------------------------

def _coerce_date(v, field: str = "date") -> date | None:
    """'YYYY-MM-DD' veya 'DD.MM.YYYY' kabul eder; str -> date.
       None geçer; datetime -> .date(). Hata -> AppError(400)."""
    if v is None:
        return None
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, str):
        s = v.strip()
        for fmt in ("%Y-%m-%d", "%d.%m.%Y"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                pass
        raise AppError(f"{field} must be YYYY-MM-DD (or DD.MM.YYYY).", 400,
                       code="INVALID_DATE", details={"field": field, "given": v})
    raise AppError(f"{field} has invalid type.", 400,
                   code="INVALID_DATE_TYPE", details={"field": field, "type": type(v).__name__})

def _to_decimal(val) -> Decimal | None:
    if val is None or (isinstance(val, str) and val.strip() == ""):
        return None
    try:
        return Decimal(str(val))
    except Exception:
        raise AppError("amount must be a number.", 400, code="INVALID_AMOUNT", details={"given": val})

def _normalize_dates(payload: dict) -> dict:
    out = dict(payload or {})
    for k, v in list(out.items()):
        if k.endswith("_date") or k in {"transaction_date", "posted_date", "due_date"}:
            out[k] = _coerce_date(v, k)
    return out

# -------------------------- brands --------------------------

@service_logger
def get_all_card_brands():
    return CardBrand.query.all()

@service_logger
def get_card_brand_by_id(brand_id: int):
    return CardBrand.query.get(brand_id)

@service_logger
def create_card_brand(data: dict):
    if not data or not data.get("name"):
        raise AppError("name is required.", 400, code="EMPTY_NAME")
    brand = CardBrand(**data)
    db.session.add(brand)
    db.session.commit()
    dinfo("cc.brand.create", brand_id=brand.id)
    return brand

@service_logger
def update_card_brand(brand_id: int, data: dict):
    brand = CardBrand.query.get(brand_id)
    if not brand:
        raise AppError("Card brand not found.", 404, code="BRAND_NOT_FOUND")
    if "name" in data and (data["name"] or "").strip() == "":
        raise AppError("name cannot be empty.", 400, code="EMPTY_NAME")
    for k, v in (data or {}).items():
        if hasattr(brand, k):
            setattr(brand, k, v)
    db.session.commit()
    dinfo("cc.brand.update", brand_id=brand.id)
    return brand

@service_logger
def delete_card_brand(brand_id: int):
    brand = CardBrand.query.get(brand_id)
    if not brand:
        raise AppError("Card brand not found.", 404, code="BRAND_NOT_FOUND")
    db.session.delete(brand)
    db.session.commit()
    dinfo("cc.brand.delete", brand_id=brand_id)
    return True

# -------------------------- credit cards --------------------------

@service_logger
def get_all_credit_cards():
    """Kartları son statüleriyle getirir (en güncel StatusHistory kaydı)."""
    sh = aliased(StatusHistory)
    latest_status_ids = (
        db.session.query(func.max(sh.id))
        .filter(sh.subject_type == "credit_card")
        .group_by(sh.subject_id)
        .scalar_subquery()
    )
    rows = (
        db.session.query(CreditCard, StatusHistory.status, StatusHistory.start_date)
        .outerjoin(
            StatusHistory,
            (CreditCard.id == StatusHistory.subject_id)
            & (StatusHistory.subject_type == "credit_card")
            & (StatusHistory.id.in_(latest_status_ids))
        )
        .all()
    )
    out = []
    for card, status, start_date in rows:
        card.status = status or "Aktif"
        card.status_start_date = start_date
        out.append(card)
    # read-only → kısa breadcrumb
    dinfo("cc.list", count=len(out))
    return out

@service_logger
def get_credit_card_by_id(card_id: int):
    card = CreditCard.query.get(card_id)
    if not card:
        raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")
    return card

@service_logger
def create_credit_card(data: dict):
    if not data or not data.get("name"):
        raise AppError("name is required.", 400, code="EMPTY_NAME")
    # PaymentType oluştur
    pt = PaymentType(name=f"Kredi Kartı - {data.get('name')}", region_id=data.get("region_id"))
    db.session.add(pt)
    db.session.flush()
    data = dict(data)
    data["payment_type_id"] = pt.id

    card = CreditCard(**data)
    db.session.add(card)
    db.session.commit()
    dinfo("cc.create", card_id=card.id, payment_type_id=pt.id)
    return card

@service_logger
def update_credit_card(card_id: int, data: dict):
    card = CreditCard.query.get(card_id)
    if not card:
        raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")

    data = dict(data or {})
    # özel durum: statü güncellemesi
    if "status" in data and "start_date" in data:
        generic_save_status({
            "subject_id": card_id,
            "subject_type": "credit_card",
            "status": data["status"],
            "start_date": _coerce_date(data["start_date"], "start_date")
        })
        data.pop("status", None)
        data.pop("start_date", None)

    for k, v in data.items():
        if hasattr(card, k):
            setattr(card, k, v)

    db.session.commit()
    dinfo("cc.update", card_id=card.id)
    return card

@service_logger
def delete_credit_card(card_id: int):
    card = CreditCard.query.get(card_id)
    if not card:
        raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")
    db.session.delete(card)
    db.session.commit()
    dinfo("cc.delete", card_id=card_id)
    return True

# -------------------------- transactions --------------------------

@service_logger
def get_transactions_for_card(card_id: int):
    # kart yoksa boş liste döndürmek isteyebilirsin; burada 404 veriyoruz
    _ = get_credit_card_by_id(card_id)  # 404 fırlatırsa route yakalar
    txs = CreditCardTransaction.query.filter_by(credit_card_id=card_id).all()
    dinfo("cc.tx.list", card_id=card_id, count=len(txs))
    return txs

@service_logger
def add_transaction_to_card(card_id: int, data: dict):
    card = CreditCard.query.get(card_id)
    if not card:
        raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")

    payload = _normalize_dates(data)
    # minimum alan kontrolleri (gerekirse genişlet)
    if "transaction_date" not in payload:
        raise AppError("transaction_date is required.", 400, code="MISSING_DATE")
    payload["transaction_date"] = _coerce_date(payload["transaction_date"], "transaction_date")
    if "amount" in payload:
        payload["amount"] = _to_decimal(payload["amount"])

    tx = CreditCardTransaction(credit_card_id=card_id, **payload)
    db.session.add(tx)
    db.session.commit()

    dinfo("cc.tx.create", card_id=card_id, tx_id=tx.id)
    return tx

@service_logger
def update_transaction(transaction_id: int, data: dict):
    tx = CreditCardTransaction.query.get(transaction_id)
    if not tx:
        raise AppError("Transaction not found.", 404, code="TX_NOT_FOUND")

    payload = _normalize_dates(data or {})
    if "amount" in payload:
        payload["amount"] = _to_decimal(payload["amount"])
    for k, v in payload.items():
        if hasattr(tx, k):
            setattr(tx, k, v)

    db.session.commit()
    dinfo("cc.tx.update", tx_id=tx.id)
    return tx

@service_logger
def delete_transaction(transaction_id: int):
    tx = CreditCardTransaction.query.get(transaction_id)
    if not tx:
        raise AppError("Transaction not found.", 404, code="TX_NOT_FOUND")
    db.session.delete(tx)
    db.session.commit()
    dinfo("cc.tx.delete", tx_id=transaction_id)
    return True

@service_logger
def bulk_add_transactions_to_card(card_id: int, transactions_data: Iterable[dict]):
    card = CreditCard.query.get(card_id)
    if not card:
        raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")

    if not isinstance(transactions_data, (list, tuple)) or not transactions_data:
        raise AppError("A non-empty 'transactions' list is required.", 400, code="INVALID_PAYLOAD")

    rows = []
    for i, tx in enumerate(transactions_data, 1):
        tdate = _coerce_date(tx.get("transaction_date"), "transaction_date")
        amount = _to_decimal(tx.get("amount"))
        rows.append({
            "credit_card_id": card.id,
            "transaction_date": tdate,
            "amount": amount,
            "description": tx.get("description"),
            "currency": tx.get("currency"),
            "type": tx.get("type", "EXPENSE"),
            "bill_id": tx.get("bill_id"),
        })

    if not rows:
        dwarn("cc.tx.bulk.empty", card_id=card_id)
        return []

    db.session.bulk_insert_mappings(CreditCardTransaction, rows)
    db.session.commit()
    dinfo("cc.tx.bulk.create", card_id=card_id, count=len(rows))
    return rows

@service_logger
def get_transactions_by_bill_id(bill_id: str):
    txs = CreditCardTransaction.query.filter_by(bill_id=bill_id).all()
    dinfo("cc.tx.by_bill", bill_id=bill_id, count=len(txs))
    return txs

@service_logger
def get_all_billed_transactions():
    txs = CreditCardTransaction.query.filter(CreditCardTransaction.bill_id.isnot(None)).all()
    dinfo("cc.tx.billed", count=len(txs))
    return txs

# -------------------------- daily limits --------------------------

@service_logger
def get_daily_limits_for_month(year: int, month: int):
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    limits = (
        DailyCreditCardLimit.query.options(
            joinedload(DailyCreditCardLimit.credit_card)
            .joinedload(CreditCard.bank_account)
            .joinedload(BankAccount.bank)
        )
        .filter(DailyCreditCardLimit.entry_date.between(start_date, end_date))
        .order_by(DailyCreditCardLimit.entry_date)
        .all()
    )
    out = []
    for rec in limits:
        if rec.credit_card and rec.credit_card.bank_account and rec.credit_card.bank_account.bank:
            out.append({
                "id": rec.id,
                "credit_card_id": rec.credit_card_id,
                "entry_date": rec.entry_date.isoformat(),
                "morning_limit": str(rec.morning_limit) if rec.morning_limit is not None else None,
                "evening_limit": str(rec.evening_limit) if rec.evening_limit is not None else None,
                "bank_name": rec.credit_card.bank_account.bank.name,
                "card_name": rec.credit_card.name,
            })
    dinfo("cc.limits.month", year=year, month=month, rows=len(out))
    return out

@service_logger
def save_daily_limits(entries_data: list):
    if not entries_data:
        raise AppError("entries must not be empty.", 400, code="EMPTY_ENTRIES")

    try:
        grouped: dict[int, list[dict]] = {}
        for entry in entries_data:
            cid = entry.get("credit_card_id")
            if not cid:
                raise AppError("credit_card_id is required in entries.", 400, code="MISSING_CARD_ID")
            grouped.setdefault(cid, []).append(entry)

        for card_id, entries in grouped.items():
            card = CreditCard.query.get(card_id)
            if not card:
                raise AppError(f"Credit card {card_id} not found.", 404, code="CARD_NOT_FOUND")

            entries_sorted = sorted(entries, key=lambda x: _coerce_date(x["tarih"], "tarih"))
            for e in entries_sorted:
                sub_date = _coerce_date(e["tarih"], "tarih")

                last_rec = (
                    DailyCreditCardLimit.query
                    .filter(DailyCreditCardLimit.credit_card_id == card_id,
                            DailyCreditCardLimit.entry_date < sub_date)
                    .order_by(DailyCreditCardLimit.entry_date.desc())
                    .first()
                )

                fill_value: Decimal | None = card.limit
                if last_rec:
                    fill_value = last_rec.evening_limit if last_rec.evening_limit is not None else last_rec.morning_limit
                    if last_rec.evening_limit is None and fill_value is not None:
                        last_rec.evening_limit = fill_value
                        db.session.add(last_rec)

                if last_rec and fill_value is not None:
                    gap = last_rec.entry_date + timedelta(days=1)
                    while gap < sub_date:
                        exists = DailyCreditCardLimit.query.filter_by(credit_card_id=card_id, entry_date=gap).first()
                        if not exists:
                            db.session.add(DailyCreditCardLimit(
                                credit_card_id=card_id, entry_date=gap,
                                morning_limit=fill_value, evening_limit=fill_value
                            ))
                        gap += timedelta(days=1)

                sabah = _to_decimal(e.get("sabah"))
                aksam = _to_decimal(e.get("aksam")) if "aksam" in e else None

                existing = DailyCreditCardLimit.query.filter_by(credit_card_id=card_id, entry_date=sub_date).first()
                if existing:
                    if sabah is not None:
                        existing.morning_limit = sabah
                    if "aksam" in e:
                        existing.evening_limit = aksam
                else:
                    if sabah is None:
                        sabah = fill_value
                    db.session.add(DailyCreditCardLimit(
                        credit_card_id=card_id, entry_date=sub_date,
                        morning_limit=sabah, evening_limit=aksam
                    ))

        db.session.commit()
        dinfo("cc.limits.save", cards=len(grouped))
        return {"message": "Günlük limitler başarıyla kaydedildi."}

    except AppError:
        db.session.rollback()
        raise
    except Exception as ex:
        db.session.rollback()
        derr("cc.limits.unhandled", err=ex)
        raise
@service_logger
def get_credit_cards_grouped_by_bank():
    """
    Geriye uyumlu shim:
    - Kartları bankasına göre gruplayıp {bank_name: [CreditCard, ...]} döner.
    - N+1 yememek için joinload kullanır.
    - Domain loguna kısa bir özet bırakır.
    NOT: Model nesneleri döner (JSON'lanmaz). Dashboard tarafı eskiden nasıl kullanıyorsa aynı şekilde çalışır.
    """
    cards = (
        CreditCard.query.options(
            joinedload(CreditCard.bank_account).joinedload(BankAccount.bank)
        ).all()
    )

    grouped = {}
    for c in cards:
        bank_name = (
            c.bank_account.bank.name
            if c.bank_account and c.bank_account.bank
            else "Unknown"
        )
        grouped.setdefault(bank_name, []).append(c)

    dinfo("cc.grouped_by_bank", banks=len(grouped), cards=len(cards))
    return grouped
