
# app/banks/services.py
from __future__ import annotations

from decimal import Decimal
from datetime import date, datetime, timedelta
from typing import Union

from sqlalchemy import func, and_
from sqlalchemy.orm import aliased, joinedload

from app import db
from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr

from .models import (
    Bank, BankAccount, DailyBalance, StatusHistory, KmhLimit, DailyRisk, Currency
)
from app.credit_cards.models import CreditCard
from app.loans.models import Loan, LoanPayment
from app.bank_logs.models import BankLog


# ----------------------------- Helpers -----------------------------

def _parse_date_string(date_str: str) -> date:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        raise AppError("Invalid date format. Expected YYYY-MM-DD.", 400, code="BAD_DATE")

def _to_decimal(value) -> Union[Decimal, None]:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except Exception:
        raise AppError("Invalid numeric value.", 400, code="BAD_DECIMAL")

def get_exchange_rates() -> dict:
    # TODO: gerçek kur servisi ile değiştir
    return {"USD": 30.0, "EUR": 32.0, "TRY": 1.0}


# ------------------------------ Banks ------------------------------

@service_logger
def get_all_banks():
    rows = Bank.query.options(
        joinedload(Bank.accounts).joinedload(BankAccount.kmh_limits)
    ).all()
    dinfo("banks.list", count=len(rows))
    return rows

@service_logger
def create_bank(data: dict):
    name = (data or {}).get("name")
    if not name:
        raise AppError("name is required.", 400, code="EMPTY_NAME")
    bank = Bank(name=name, logo_url=data.get("logo_url"))
    db.session.add(bank)
    db.session.commit()
    dinfo("banks.create", bank_id=bank.id)
    return bank

@service_logger
def get_bank_by_id(bank_id: int):
    bank = Bank.query.get(bank_id)
    if not bank:
        raise AppError("Bank not found.", 404, code="NOT_FOUND")
    return bank

@service_logger
def update_bank(bank_id: int, data: dict):
    bank = Bank.query.get(bank_id)
    if not bank:
        raise AppError("Bank not found.", 404, code="NOT_FOUND")
    data = data or {}
    bank.name = data.get("name", bank.name)
    bank.logo_url = data.get("logo_url", bank.logo_url)
    db.session.commit()
    dinfo("banks.update", bank_id=bank_id)
    return bank

@service_logger
def delete_bank(bank_id: int) -> bool:
    bank = Bank.query.get(bank_id)
    if not bank:
        raise AppError("Bank not found.", 404, code="NOT_FOUND")
    db.session.delete(bank)
    db.session.commit()
    dinfo("banks.delete", bank_id=bank_id)
    return True

@service_logger
def get_bank_summary(bank_id: int, bank_account_id: int | None = None) -> dict:
    """
    Özet metrikler:
      - total_assets_in_try
      - total_credit_card_debt
      - total_loan_debt (aylık taksit * vade toplamı olarak mevcut mantık)
      - total_loan_principal
      - total_paid_amount (loan ödemeleri)
    """
    summary = {
        "total_assets_in_try": 0.0,
        "total_credit_card_debt": 0.0,
        "total_loan_debt": 0.0,
        "total_loan_principal": 0.0,
        "total_paid_amount": 0.0,
    }

    # --- Assets ---
    if bank_account_id:
        latest_balance = (
            db.session.query(DailyBalance)
            .filter(DailyBalance.bank_account_id == bank_account_id)
            .order_by(DailyBalance.entry_date.desc())
            .first()
        )
        if latest_balance:
            balance_value = latest_balance.evening_balance
            if balance_value is None:
                balance_value = latest_balance.morning_balance
            summary["total_assets_in_try"] = float(balance_value or 0.0)
    else:
        latest_log = (
            db.session.query(BankLog)
            .filter_by(bank_id=bank_id)
            .order_by(BankLog.date.desc(), BankLog.period.desc())
            .first()
        )
        if latest_log:
            r = get_exchange_rates()
            total = Decimal("0")
            total += (latest_log.amount_try or Decimal("0")) * Decimal(str(r.get("TRY", 1.0)))
            total += (latest_log.amount_usd or Decimal("0")) * Decimal(str(r.get("USD", 30.0)))
            total += (latest_log.amount_eur or Decimal("0")) * Decimal(str(r.get("EUR", 32.0)))
            summary["total_assets_in_try"] = float(total)

    # --- Credit card debt ---
    card_q = db.session.query(CreditCard).join(BankAccount).filter(BankAccount.bank_id == bank_id)
    if bank_account_id:
        card_q = card_q.filter(BankAccount.id == bank_account_id)
    cards = card_q.all()
    cc_debt = sum((c.current_debt or 0) for c in cards)
    summary["total_credit_card_debt"] = float(cc_debt)

    # --- Loans (principal & “total debt” mevcut mantık) ---
    loan_q = (
        db.session.query(Loan)
        .join(BankAccount, Loan.bank_account_id == BankAccount.id)
        .filter(BankAccount.bank_id == bank_id)
    )
    if bank_account_id:
        loan_q = loan_q.filter(BankAccount.id == bank_account_id)
    loans = loan_q.all()
    total_loan_debt = sum((loan.monthly_payment_amount or 0) * (loan.term_months or 0) for loan in loans)
    loan_principal = sum((loan.amount_drawn or 0) for loan in loans)
    summary["total_loan_debt"] = float(total_loan_debt)
    summary["total_loan_principal"] = float(loan_principal)

    # --- Paid amount (loans) ---
    paid_q = (
        db.session.query(func.sum(LoanPayment.amount_paid))
        .join(Loan, LoanPayment.loan_id == Loan.id)
        .join(BankAccount, Loan.bank_account_id == BankAccount.id)
        .filter(BankAccount.bank_id == bank_id)
    )
    if bank_account_id:
        paid_q = paid_q.filter(BankAccount.id == bank_account_id)
    total_paid = paid_q.scalar()
    summary["total_paid_amount"] = float(total_paid or 0)

    dinfo("banks.summary", bank_id=bank_id, bank_account_id=bank_account_id, **summary)
    return summary


# --------------------------- Bank Accounts ---------------------------

@service_logger
def create_bank_account(data: dict):
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")

    try:
        currency_str = data.get("currency")
        currency = Currency[currency_str] if currency_str else None
        acc = BankAccount(
            name=data.get("name"),
            bank_id=data.get("bank_id"),
            iban_number=data.get("iban_number"),
            currency=currency,
        )
        if not acc.name or not acc.bank_id:
            raise AppError("name and bank_id are required.", 400, code="MISSING_FIELDS")

        db.session.add(acc)
        db.session.flush()  # id elde et

        if data.get("create_kmh_limit"):
            kmh_data = {
                "bank_account_id": acc.id,
                "name": data.get("kmh_name") or f"KMH-{acc.name}",
                "kmh_limit": data.get("kmh_limit"),
                "statement_day": data.get("statement_day") or 1,
            }
            create_kmh_limit(kmh_data)
        db.session.commit()
        dinfo("bank_accounts.create", account_id=acc.id, with_kmh=bool(data.get("create_kmh_limit")))
        return acc

    except AppError:
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("bank_accounts.create.unhandled", err=e)
        raise
@service_logger
def get_all_bank_accounts():
    """
    Tüm banka hesaplarını getirir. Her hesap için iki tür durum bilgisi hesaplar:
    1. current_status: Bugün itibarıyla geçerli olan durum (Bank Card'lar için).
    2. pivot_status: Pivot tabloda geçmişi kilitlemek için gereken en son Pasif/Bloke dönemi.
    """
    today = date.today()

    # 1. Her hesap için BUGÜN GEÇERLİ OLAN durum kaydını bulan subquery
    currently_valid_status_sq = (
        db.session.query(
            StatusHistory.subject_id,
            func.max(StatusHistory.id).label("latest_id"),
        )
        .filter(
            StatusHistory.subject_type == "bank_account",
            StatusHistory.start_date <= today,
            (StatusHistory.end_date.is_(None)) | (StatusHistory.end_date >= today)
        )
        .group_by(StatusHistory.subject_id)
        .subquery()
    )

    # 2. Her hesap için EN SON EKLENMİŞ Pasif/Bloke kaydını bulan subquery
    latest_inactive_status_sq = (
        db.session.query(
            StatusHistory.subject_id,
            func.max(StatusHistory.id).label("latest_id"),
        )
        .filter(
            StatusHistory.subject_type == "bank_account",
            StatusHistory.status.in_(['Pasif', 'Bloke'])
        )
        .group_by(StatusHistory.subject_id)
        .subquery()
    )
    
    # Bakiye subquery'leri (Bunlar zaten doğruydu)
    LastMorning = aliased(DailyBalance)
    sq_morning = (
        db.session.query(
            LastMorning.bank_account_id,
            func.max(LastMorning.entry_date).label("latest_date"),
        )
        .filter(LastMorning.morning_balance.isnot(None))
        .group_by(LastMorning.bank_account_id)
        .subquery()
    )

    LastEvening = aliased(DailyBalance)
    sq_evening = (
        db.session.query(
            LastEvening.bank_account_id,
            func.max(LastEvening.entry_date).label("latest_date"),
        )
        .filter(LastEvening.evening_balance.isnot(None))
        .group_by(LastEvening.bank_account_id)
        .subquery()
    )

    MorningBalance = aliased(DailyBalance)
    EveningBalance = aliased(DailyBalance)
    CurrentStatus = aliased(StatusHistory)
    PivotStatus = aliased(StatusHistory)

    # Ana sorgu
    query = (
        db.session.query(
            BankAccount,
            MorningBalance.morning_balance,
            EveningBalance.evening_balance,
            CurrentStatus.status,
            PivotStatus.status,
            PivotStatus.start_date,
            PivotStatus.end_date,
        )
        # --- DÜZELTİLEN KISIM: Bakiye join'leri eksiksiz hale getirildi ---
        .outerjoin(sq_morning, BankAccount.id == sq_morning.c.bank_account_id)
        .outerjoin(
            MorningBalance,
            and_(
                MorningBalance.bank_account_id == sq_morning.c.bank_account_id,
                MorningBalance.entry_date == sq_morning.c.latest_date,
            ),
        )
        .outerjoin(sq_evening, BankAccount.id == sq_evening.c.bank_account_id)
        .outerjoin(
            EveningBalance,
            and_(
                EveningBalance.bank_account_id == sq_evening.c.bank_account_id,
                EveningBalance.entry_date == sq_evening.c.latest_date,
            ),
        )
        # --- DÜZELTME BİTTİ ---
        .outerjoin(currently_valid_status_sq, BankAccount.id == currently_valid_status_sq.c.subject_id)
        .outerjoin(CurrentStatus, CurrentStatus.id == currently_valid_status_sq.c.latest_id)
        .outerjoin(latest_inactive_status_sq, BankAccount.id == latest_inactive_status_sq.c.subject_id)
        .outerjoin(PivotStatus, PivotStatus.id == latest_inactive_status_sq.c.latest_id)
        .options(joinedload(BankAccount.bank))
    )

    results = query.all()
    accounts_data = []
    # for döngüsü ve sonrası aynı kalıyor...
    for acc, mor, eve, current_status, pivot_status, pivot_start, pivot_end in results:
        account_dict = {
            "id": acc.id,
            "name": acc.name,
            "bank_id": acc.bank_id,
            "iban_number": acc.iban_number,
            "currency": acc.currency.value if acc.currency else None,
            "bank": {"id": acc.bank.id, "name": acc.bank.name} if acc.bank else None,
            "last_morning_balance": mor,
            "last_evening_balance": eve,
            "status": current_status or "Aktif",
            "pivot_status": pivot_status,
            "pivot_start_date": pivot_start.isoformat() if pivot_start else None,
            "pivot_end_date": pivot_end.isoformat() if pivot_end else None,
        }
        accounts_data.append(account_dict)

    dinfo("bank_accounts.list_with_status", count=len(accounts_data))
    return accounts_data
@service_logger
def get_bank_account_by_id(account_id: int):
    acc = BankAccount.query.get(account_id)
    if not acc:
        raise AppError("Bank account not found.", 404, code="NOT_FOUND")
    return acc

@service_logger
def update_bank_account(account_id: int, data: dict):
    acc = BankAccount.query.get(account_id)
    if not acc:
        raise AppError("Bank account not found.", 404, code="NOT_FOUND")
    data = data or {}
    acc.name = data.get("name", acc.name)
    acc.bank_id = data.get("bank_id", acc.bank_id)
    acc.iban_number = data.get("iban_number", acc.iban_number)
    currency_str = data.get("currency")
    if currency_str:
        acc.currency = Currency[currency_str]
    db.session.commit()
    dinfo("bank_accounts.update", account_id=account_id)
    return acc

@service_logger
def delete_bank_account(account_id: int) -> bool:
    acc = BankAccount.query.get(account_id)
    if not acc:
        raise AppError("Bank account not found.", 404, code="NOT_FOUND")
    db.session.delete(acc)
    db.session.commit()
    dinfo("bank_accounts.delete", account_id=account_id)
    return True


@service_logger
def get_all_accounts_for_selection():
    return BankAccount.query.options(joinedload(BankAccount.bank)).all()


# ------------------------------- KMH -------------------------------

@service_logger
def get_kmh_accounts():
    LatestRisk = aliased(DailyRisk)
    sq_risk = (
        db.session.query(
            LatestRisk.kmh_limit_id,
            func.max(LatestRisk.entry_date).label("latest_date"),
        )
        .group_by(LatestRisk.kmh_limit_id)
        .subquery()
    )

    latest_status_sq = (
        db.session.query(
            StatusHistory.subject_id,
            func.max(StatusHistory.id).label("latest_id"),
        )
        .filter(StatusHistory.subject_type == "kmh_limit")
        .group_by(StatusHistory.subject_id)
        .subquery()
    )

    rows = (
        db.session.query(
            KmhLimit,
            BankAccount,
            Bank,
            DailyRisk.morning_risk,
            DailyRisk.evening_risk,
            StatusHistory.status,
            StatusHistory.start_date,
        )
        .join(BankAccount, KmhLimit.bank_account_id == BankAccount.id)
        .join(Bank, BankAccount.bank_id == Bank.id)
        .outerjoin(sq_risk, KmhLimit.id == sq_risk.c.kmh_limit_id)
        .outerjoin(
            DailyRisk,
            and_(
                DailyRisk.kmh_limit_id == sq_risk.c.kmh_limit_id,
                DailyRisk.entry_date == sq_risk.c.latest_date,
            ),
        )
        .outerjoin(latest_status_sq, KmhLimit.id == latest_status_sq.c.subject_id)
        .outerjoin(StatusHistory, StatusHistory.id == latest_status_sq.c.latest_id)
        .all()
    )

    out = []
    for kmh, acc, bank, m_risk, e_risk, status, start_date in rows:
        out.append(
            {
                "id": kmh.id,
                "name": kmh.name,
                "bank_name": bank.name,
                "bank_account_name": acc.name,   # ✅ ilişikli hesap adı
                "kmh_limit": float(kmh.kmh_limit),
                "statement_date_str": f"{kmh.statement_day}",
                "current_morning_risk": float(m_risk) if m_risk is not None else 0,
                "current_evening_risk": float(e_risk) if e_risk is not None else 0,
                "status": status or "Aktif",
                "status_start_date": start_date.isoformat() if start_date else None,
            }
        )

    dinfo("kmh.list", count=len(out))
    return out

@service_logger
def get_daily_risks_for_month(year: int, month: int):
    start = date(year, month, 1)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    rows = (
        db.session.query(DailyRisk)
        .join(KmhLimit)
        .filter(DailyRisk.entry_date.between(start, end))
        .all()
    )
    out = [
        {
            "kmh_limit_id": r.kmh_limit_id,
            "entry_date": r.entry_date.isoformat(),
            "morning_risk": float(r.morning_risk) if r.morning_risk is not None else None,
            "evening_risk": float(r.evening_risk) if r.evening_risk is not None else None,
        }
        for r in rows
    ]
    dinfo("kmh.daily_risks", year=year, month=month, count=len(out))
    return out

@service_logger
def save_daily_risk_entries(entries_data: list):
    if not entries_data:
        return {"message": "No data to save."}

    try:
        for entry in entries_data:
            banka = entry.get("banka")
            hesap = entry.get("hesap")
            tarih = entry.get("tarih")
            if not all([banka, hesap, tarih]):
                raise AppError("banka, hesap, tarih are required.", 400, code="MISSING_FIELDS")

            kmh = (
                KmhLimit.query.join(BankAccount).join(Bank)
                .filter(Bank.name == banka, KmhLimit.name == hesap)
                .first()
            )
            if not kmh:
                dwarn("kmh.not_found_for_entry", banka=banka, hesap=hesap)
                continue

            entry_date = _parse_date_string(tarih)
            existing = DailyRisk.query.filter_by(kmh_limit_id=kmh.id, entry_date=entry_date).first()

            sabah = entry.get("sabah")
            aksam = entry.get("aksam")
            sabah_dec = _to_decimal(sabah) if sabah is not None else None
            aksam_dec = _to_decimal(aksam) if aksam is not None else None

            if existing:
                if sabah is not None:
                    existing.morning_risk = sabah_dec
                if aksam is not None:
                    existing.evening_risk = aksam_dec
                db.session.add(existing)
            else:
                db.session.add(
                    DailyRisk(
                        kmh_limit_id=kmh.id,
                        entry_date=entry_date,
                        morning_risk=sabah_dec,
                        evening_risk=aksam_dec,
                    )
                )

        db.session.commit()
        dinfo("kmh.daily_entries.save", items=len(entries_data))
        return {"message": "Daily risk entries saved successfully."}

    except AppError:
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("kmh.daily_entries.unhandled", err=e)
        raise

@service_logger
def create_kmh_limit(data: dict):
    acc_id = (data or {}).get("bank_account_id")
    if not acc_id:
        raise AppError("bank_account_id is required.", 400, code="MISSING_FIELDS")
    acc = BankAccount.query.get(acc_id)
    if not acc:
        raise AppError("Associated BankAccount not found.", 404, code="NOT_FOUND")

    row = KmhLimit(
        name=data.get("name") or f"KMH-{acc.name}",
        bank_account_id=acc_id,
        kmh_limit=_to_decimal(data.get("kmh_limit")),
        statement_day=data.get("statement_day") or 1,
    )
    db.session.add(row)
    db.session.commit()
    dinfo("kmh.create", kmh_id=row.id, bank_account_id=acc_id)
    return row

@service_logger
def update_kmh_limit(kmh_id: int, data: dict):
    row = KmhLimit.query.get(kmh_id)
    if not row:
        raise AppError("KMH limit not found.", 404, code="NOT_FOUND")

    if "kmh_limit" in data:
        row.kmh_limit = _to_decimal(data["kmh_limit"])
    if "statement_day" in data:
        row.statement_day = data["statement_day"]

    # status değişikliği (opsiyonel)
    if data.get("status") and data.get("start_date") is not None:
        save_status(
            {
                "subject_id": kmh_id,
                "subject_type": "kmh_limit",
                "status": data["status"],
                "start_date": data["start_date"],  # string (YYYY-MM-DD)
                "reason": data.get("reason"),
            }
        )
    db.session.commit()
    dinfo("kmh.update", kmh_id=kmh_id)
    return row

@service_logger
def delete_kmh_limit(kmh_id: int) -> bool:
    kmh = KmhLimit.query.get(kmh_id)
    if not kmh:
        raise AppError("KMH record not found.", 404, code="NOT_FOUND")
    StatusHistory.query.filter_by(subject_type="kmh_limit", subject_id=kmh_id).delete(synchronize_session=False)
    db.session.delete(kmh)
    db.session.commit()
    dinfo("kmh.delete", kmh_id=kmh_id)
    return True


# -------------------------- Status / History --------------------------

@service_logger
def get_status_history(subject_type: str, subject_id: int):
    if not subject_type or subject_id is None:
        raise AppError("subject_type and subject_id are required.", 400, code="MISSING_FIELDS")
    rows = (
        StatusHistory.query.filter_by(subject_id=subject_id, subject_type=subject_type)
        .order_by(StatusHistory.start_date.desc())
        .all()
    )
    dinfo("status_history.list", subject_type=subject_type, subject_id=subject_id, count=len(rows))
    return rows

@service_logger
def save_status(data: dict):
    """
    Generic durum güncelleme:
      - mevcut aktif kaydı (end_date is NULL) kapatır
      - yeni kaydı açar
    """
    subject_type = (data or {}).get("subject_type")
    subject_id = (data or {}).get("subject_id") or (data or {}).get("bank_account_id")  # backward compat
    new_status = (data or {}).get("status")
    start_date_str = (data or {}).get("start_date")
    end_date_str = (data or {}).get("end_date")
    reason = (data or {}).get("reason")

    if not all([subject_type, subject_id, new_status, start_date_str]):
        raise AppError("subject_id, subject_type, status, start_date are required.", 400, code="MISSING_FIELDS")

    start_date = _parse_date_string(start_date_str)
    end_date = _parse_date_string(end_date_str) if end_date_str else None

    current = (
        StatusHistory.query.filter(
            StatusHistory.subject_id == subject_id,
            StatusHistory.subject_type == subject_type,
            StatusHistory.end_date.is_(None),
        )
        .order_by(StatusHistory.start_date.desc())
        .first()
    )

    if current and current.status != new_status:
        end_date_for_old = start_date - timedelta(days=1)
        if end_date_for_old >= current.start_date:
            current.end_date = end_date_for_old
            db.session.add(current)

    if not current or current.status != new_status:
        db.session.add(
            StatusHistory(
                subject_id=subject_id,
                subject_type=subject_type,
                status=new_status,
                start_date=start_date,
                end_date=end_date,
                reason=reason,
            )
        )

    db.session.commit()
    dinfo("status_history.save", subject_type=subject_type, subject_id=subject_id, status=new_status)
    return {"message": "Durum başarıyla güncellendi."}


# ----------------------- Daily balances (Vadesiz) -----------------------

@service_logger
def get_daily_balances_for_month(year: int, month: int):
    start = date(year, month, 1)
    next_month = start.replace(day=28) + timedelta(days=4)
    end = next_month - timedelta(days=next_month.day)

    rows = (
        DailyBalance.query.options(joinedload(DailyBalance.account).joinedload(BankAccount.bank))
        .filter(DailyBalance.entry_date.between(start, end))
        .all()
    )

    out = []
    for r in rows:
        out.append(
            {
                "id": r.id,
                "bank_account_id": r.bank_account_id,
                "entry_date": r.entry_date.isoformat(),
                "morning_balance": float(r.morning_balance) if r.morning_balance is not None else None,
                "evening_balance": float(r.evening_balance) if r.evening_balance is not None else None,
                "account_name": r.account.name if r.account else None,
                "bank_name": r.account.bank.name if r.account and r.account.bank else None,
            }
        )
    dinfo("vadesiz.daily_balances", year=year, month=month, count=len(out))
    return out

@service_logger
def save_daily_balance_entries(entries_data: list):
    if not entries_data:
        return {"message": "No data to save."}

    try:
        grouped = {}
        for e in entries_data:
            banka = e.get("banka")
            hesap = e.get("hesap")
            tarih = e.get("tarih")
            if not all([banka, hesap, tarih]):
                raise AppError("banka, hesap, tarih are required.", 400, code="MISSING_FIELDS")
            grouped.setdefault((banka, hesap), []).append(e)

        for (bank_name, account_name), entries in grouped.items():
            account = (
                BankAccount.query.join(Bank)
                .filter(Bank.name == bank_name, BankAccount.name == account_name)
                .first()
            )
            if not account:
                dwarn("vadesiz.account_not_found", banka=bank_name, hesap=account_name)
                continue
            for item in entries:
                entry_date = _parse_date_string(item["tarih"])
                
                # Hesabın o tarihte pasif/bloke olup olmadığını kontrol et
                inactive_status = StatusHistory.query.filter(
                    StatusHistory.subject_type == 'bank_account',
                    StatusHistory.subject_id == account.id,
                    StatusHistory.status.in_(['Pasif', 'Bloke']),
                    StatusHistory.start_date <= entry_date,
                    (StatusHistory.end_date == None) | (StatusHistory.end_date >= entry_date)
                ).first()

                if inactive_status:
                    # Eğer o tarihte hesap pasif/bloke ise, AppError fırlat
                    raise AppError(
                        f"'{account.name}' adlı hesap {entry_date.strftime('%d.%m.%Y')} tarihinde '{inactive_status.status}' olduğu için işlem yapılamaz.",
                        400,
                        code="ACCOUNT_INACTIVE"
                    )

            # tarih sıralaması
            entries_sorted = sorted(entries, key=lambda x: _parse_date_string(x["tarih"]))

            for item in entries_sorted:
                sub_date = _parse_date_string(item["tarih"])

                # önceki son kayıt
                last = (
                    DailyBalance.query.filter(
                        DailyBalance.bank_account_id == account.id,
                        DailyBalance.entry_date < sub_date,
                    )
                    .order_by(DailyBalance.entry_date.desc())
                    .first()
                )

                fill_value = None
                if last:
                    fill_value = last.evening_balance if last.evening_balance is not None else last.morning_balance
                    if last.evening_balance is None and fill_value is not None:
                        last.evening_balance = fill_value
                        db.session.add(last)

                # gap fill
                if last and fill_value is not None:
                    gap = last.entry_date + timedelta(days=1)
                    while gap < sub_date:
                        if not DailyBalance.query.filter_by(bank_account_id=account.id, entry_date=gap).first():
                            db.session.add(
                                DailyBalance(
                                    bank_account_id=account.id,
                                    entry_date=gap,
                                    morning_balance=fill_value,
                                    evening_balance=fill_value,
                                )
                            )
                        gap += timedelta(days=1)

                sabah = item.get("sabah")
                aksam = item.get("aksam")
                sabah_dec = _to_decimal(sabah) if sabah is not None else None
                aksam_dec = _to_decimal(aksam) if aksam is not None else None

                existing = DailyBalance.query.filter_by(
                    bank_account_id=account.id, entry_date=sub_date
                ).first()

                if existing:
                    if sabah is not None:
                        existing.morning_balance = sabah_dec
                    if aksam is not None:
                        existing.evening_balance = aksam_dec
                    elif sabah is not None and aksam is None:
                        # sadece sabah verildiyse, akşamı NULL’a çek
                        existing.evening_balance = None
                    db.session.add(existing)
                else:
                    db.session.add(
                        DailyBalance(
                            bank_account_id=account.id,
                            entry_date=sub_date,
                            morning_balance=sabah_dec if sabah_dec is not None else fill_value,
                            evening_balance=aksam_dec,
                        )
                    )

        db.session.commit()
        dinfo("vadesiz.daily_entries.save", accounts=len(grouped), items=len(entries_data))
        return {"message": "Günlük girişler başarıyla kaydedildi."}

    except AppError:
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("vadesiz.daily_entries.unhandled", err=e)
        raise

