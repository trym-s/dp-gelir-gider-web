

import logging
from .models import db, Bank, BankAccount, DailyBalance, BankAccountStatusHistory, KmhLimit, DailyRisk
from app.credit_cards.models import CreditCard, CreditCardTransaction
from app.loans.models import Loan
from app.bank_logs.models import BankLog
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import aliased
from decimal import Decimal
from datetime import date, datetime, timedelta
from typing import Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper Functions ---
def _parse_date_string(date_str: str) -> date:
    """Converts a string in YYYY-MM-DD format to a date object."""
    return datetime.strptime(date_str, '%Y-%m-%d').date()

def _to_decimal(value) -> Union[Decimal, None]:
    """Converts a value to Decimal, handling None or empty strings."""
    if value is None or value == '':
        return None
    return Decimal(str(value))

def get_exchange_rates():
    # This is a placeholder. In a real app, you'd fetch this from a service.
    return {"USD": 30.0, "EUR": 32.0, "TRY": 1.0}

# --- Bank Services ---
def get_all_banks():
    return Bank.query.all()

def create_bank(data):
    bank = Bank(name=data.get('name'), logo_url=data.get('logo_url'))
    db.session.add(bank)
    db.session.commit()
    return bank

def get_bank_summary(bank_id):
    logger.info(f"--- Starting get_bank_summary for bank_id: {bank_id} ---")
    summary = {
        "total_assets_in_try": 0.0,
        "total_credit_card_debt": 0.0,
        "total_loan_debt": 0.0
    }
    try:
        latest_bank_log = db.session.query(BankLog).filter_by(bank_id=bank_id)\
            .order_by(BankLog.date.desc(), BankLog.period.desc())\
            .first()
        if latest_bank_log:
            rates = get_exchange_rates()
            total_assets = (latest_bank_log.amount_try or Decimal('0.0')) * Decimal(str(rates.get("TRY", 1.0)))
            total_assets += (latest_bank_log.amount_usd or Decimal('0.0')) * Decimal(str(rates.get("USD", 30.0)))
            total_assets += (latest_bank_log.amount_eur or Decimal('0.0')) * Decimal(str(rates.get("EUR", 32.0)))
            summary["total_assets_in_try"] = float(total_assets)
        credit_card_debt = db.session.query(func.sum(CreditCard.current_debt))\
            .join(BankAccount, CreditCard.bank_account_id == BankAccount.id)\
            .filter(BankAccount.bank_id == bank_id)\
            .scalar()
        summary["total_credit_card_debt"] = float(credit_card_debt) if credit_card_debt else 0.0
        loan_debt = db.session.query(func.sum(Loan.remaining_principal))\
            .join(BankAccount, Loan.bank_account_id == BankAccount.id)\
            .filter(BankAccount.bank_id == bank_id)\
            .scalar()
        summary["total_loan_debt"] = float(loan_debt) if loan_debt else 0.0
    except Exception as e:
        logger.exception(f"An error occurred during get_bank_summary for bank_id: {bank_id}")
        raise
    logger.info(f"--- Finished get_bank_summary. Returning: {summary} ---")
    return summary

# ... (other bank services) ...

def get_bank_by_id(bank_id):
    return Bank.query.get(bank_id)

def update_bank(bank_id, data):
    bank = get_bank_by_id(bank_id)
    if not bank:
        return None
    bank.name = data.get('name', bank.name)
    bank.logo_url = data.get('logo_url', bank.logo_url)
    db.session.commit()
    return bank

def delete_bank(bank_id):
    bank = get_bank_by_id(bank_id)
    if bank:
        db.session.delete(bank)
        db.session.commit()
        return True
    return False

# --- BankAccount Services ---
def create_bank_account(data):
    try:
        new_account = BankAccount(
            name=data.get('name'),
            bank_id=data.get('bank_id'),
            iban_number=data.get('iban_number')
        )
        db.session.add(new_account)
        db.session.flush() # Use flush to get the ID before commit

        if data.get('create_kmh_limit'):
            kmh_data = {
                'bank_account_id': new_account.id,
                'name': data.get('kmh_name'),
                'kmh_limit': data.get('kmh_limit'),
                'statement_day': data.get('statement_day')
            }
            create_kmh_limit(kmh_data)
            logger.info(f"KMH limit added to session for new bank account {new_account.id}")

        db.session.commit()
        return new_account
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating bank account or KMH limit: {e}", exc_info=True)
        raise ValueError(f"Failed to create bank account or KMH limit: {e}")

def get_all_bank_accounts():
    return BankAccount.query.all()

def get_bank_account_by_id(account_id):
    return BankAccount.query.get(account_id)

def update_bank_account(account_id, data):
    account = get_bank_account_by_id(account_id)
    if not account:
        return None

    account.name = data.get('name', account.name)
    account.bank_id = data.get('bank_id', account.bank_id)
    account.iban_number = data.get('iban_number', account.iban_number)
    
    db.session.commit()
    return account

def delete_bank_account(account_id):
    account = get_bank_account_by_id(account_id)
    if account:
        db.session.delete(account)
        db.session.commit()
        return True
    return False

# --- KMH Services ---
def get_kmh_accounts():
    today = date.today()
    LatestRisk = aliased(DailyRisk)
    latest_risk_subquery = db.session.query(
        LatestRisk.kmh_limit_id,
        func.max(LatestRisk.entry_date).label('latest_date')
    ).group_by(LatestRisk.kmh_limit_id).subquery()
    results = db.session.query(
        KmhLimit, BankAccount, Bank, DailyRisk.morning_risk, DailyRisk.evening_risk
    ).join(BankAccount, KmhLimit.bank_account_id == BankAccount.id)\
     .join(Bank, BankAccount.bank_id == Bank.id)\
     .outerjoin(latest_risk_subquery, KmhLimit.id == latest_risk_subquery.c.kmh_limit_id)\
     .outerjoin(DailyRisk, and_(
         KmhLimit.id == DailyRisk.kmh_limit_id,
         DailyRisk.entry_date == latest_risk_subquery.c.latest_date
     )).all()
    accounts_list = []
    for kmh_limit, account, bank, morning_risk, evening_risk in results:
        accounts_list.append({
            "id": kmh_limit.id, "name": kmh_limit.name, "bank_name": bank.name,
            "kmh_limit": float(kmh_limit.kmh_limit),
            "statement_date_str": f"{kmh_limit.statement_day}",
            "current_morning_risk": float(morning_risk) if morning_risk is not None else 0,
            "current_evening_risk": float(evening_risk) if evening_risk is not None else 0,
            "status": "Aktif"
        })
    return accounts_list

def get_daily_risks_for_month(year: int, month: int):
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    risks = db.session.query(DailyRisk).join(KmhLimit).filter(
        DailyRisk.entry_date.between(start_date, end_date)
    ).all()
    return [{
        "kmh_limit_id": risk.kmh_limit_id,
        "entry_date": risk.entry_date.isoformat(),
        "morning_risk": float(risk.morning_risk) if risk.morning_risk is not None else None,
        "evening_risk": float(risk.evening_risk) if risk.evening_risk is not None else None,
    } for risk in risks]

def save_daily_risk_entries(entries_data: list):
    if not entries_data:
        return {"message": "No data to save."}
    try:
        for entry_data in entries_data:
            kmh_limit = KmhLimit.query.join(BankAccount).join(Bank).filter(
                Bank.name == entry_data['banka'],
                KmhLimit.name == entry_data['hesap']
            ).first()
            if not kmh_limit:
                logger.warning(f"KmhLimit not found for: {entry_data['banka']} - {entry_data['hesap']}")
                continue
            entry_date = _parse_date_string(entry_data['tarih'])
            existing_entry = DailyRisk.query.filter_by(
                kmh_limit_id=kmh_limit.id, entry_date=entry_date
            ).first()
            if existing_entry:
                if 'sabah' in entry_data and entry_data['sabah'] is not None:
                    existing_entry.morning_risk = _to_decimal(entry_data['sabah'])
                if 'aksam' in entry_data and entry_data['aksam'] is not None:
                    existing_entry.evening_risk = _to_decimal(entry_data['aksam'])
            else:
                new_entry = DailyRisk(
                    kmh_limit_id=kmh_limit.id, entry_date=entry_date,
                    morning_risk=_to_decimal(entry_data.get('sabah')),
                    evening_risk=_to_decimal(entry_data.get('aksam'))
                )
                db.session.add(new_entry)
        db.session.commit()
        return {"message": "Daily risk entries saved successfully."}
    except Exception as e:
        db.session.rollback()
        logger.exception("Error saving daily risk entries.")
        raise ValueError(f"An unexpected error occurred while saving entries: {e}")

def create_kmh_limit(data):
    bank_account = BankAccount.query.get(data.get('bank_account_id'))
    if not bank_account:
        raise ValueError("Associated BankAccount not found.")
    
    new_limit = KmhLimit(
        name=data.get('name'),
        bank_account_id=data.get('bank_account_id'),
        kmh_limit=_to_decimal(data.get('kmh_limit')),
        statement_day=data.get('statement_day')
    )
    db.session.add(new_limit)
    return new_limit

def get_balance_history_for_account(bank_name: str, account_name: str):
    bank_account = BankAccount.query.join(Bank).filter(
        Bank.name == bank_name,
        BankAccount.name == account_name
    ).first()
    if not bank_account:
        return []
    
    balances = DailyBalance.query.filter_by(bank_account_id=bank_account.id).order_by(DailyBalance.entry_date.asc()).all()
    return [{
        "entry_date": b.entry_date.isoformat(),
        "morning_balance": float(b.morning_balance) if b.morning_balance is not None else None,
        "evening_balance": float(b.evening_balance) if b.evening_balance is not None else None,
    } for b in balances]

# --- Daily Balance Services (for VADESIZ accounts) ---
def get_daily_balances_for_month(year: int, month: int):
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)

    daily_balances = DailyBalance.query.filter(
        DailyBalance.entry_date.between(start_date, end_date)
    ).all()

    return [{
        "bank_account_id": db.session.query(BankAccount.id).filter(BankAccount.name == db.session.query(BankAccount.name).filter_by(id=balance.bank_account_id).scalar()).scalar(),
        "bank_name": db.session.query(Bank.name).join(BankAccount).filter(BankAccount.id == balance.bank_account_id).scalar(),
        "account_name": db.session.query(BankAccount.name).filter_by(id=balance.bank_account_id).scalar(),
        "entry_date": balance.entry_date.isoformat(),
        "morning_balance": float(balance.morning_balance) if balance.morning_balance is not None else None,
        "evening_balance": float(balance.evening_balance) if balance.evening_balance is not None else None,
    } for balance in daily_balances]

def save_daily_balance_entries(entries_data: list):
    if not entries_data:
        return {"message": "No data to save."}
    try:
        for entry_data in entries_data:
            bank_account = BankAccount.query.join(Bank).filter(
                Bank.name == entry_data['banka'],
                BankAccount.name == entry_data['hesap']
            ).first()
            if not bank_account:
                logger.warning(f"BankAccount not found for: {entry_data['banka']} - {entry_data['hesap']}")
                continue
            entry_date = _parse_date_string(entry_data['tarih'])
            existing_entry = DailyBalance.query.filter_by(
                bank_account_id=bank_account.id, entry_date=entry_date
            ).first()
            if existing_entry:
                if 'sabah' in entry_data and entry_data['sabah'] is not None:
                    existing_entry.morning_balance = _to_decimal(entry_data['sabah'])
                if 'aksam' in entry_data and entry_data['aksam'] is not None:
                    existing_entry.evening_balance = _to_decimal(entry_data['aksam'])
            else:
                new_entry = DailyBalance(
                    bank_account_id=bank_account.id, entry_date=entry_date,
                    morning_balance=_to_decimal(entry_data.get('sabah')),
                    evening_balance=_to_decimal(entry_data.get('aksam'))
                )
                db.session.add(new_entry)
        db.session.commit()
        return {"message": "Daily balance entries saved successfully."}
    except Exception as e:
        db.session.rollback()
        logger.exception("Error saving daily balance entries.")
        raise ValueError(f"An unexpected error occurred while saving entries: {e}")

# --- Status History Services (Generic for now) ---
def get_status_history(subject_type: str, subject_id: int):
    if subject_type == 'account':
        return BankAccountStatusHistory.query.filter_by(bank_account_id=subject_id).order_by(BankAccountStatusHistory.start_date.desc()).all()
    return []

def save_status(data: dict):
    subject_type = data.get('subject_type')
    if subject_type == 'account':
        new_status_entry = BankAccountStatusHistory(
            bank_account_id=data.get('bank_account_id'),
            status=data.get('status'),
            start_date=_parse_date_string(data.get('start_date')),
            end_date=_parse_date_string(data.get('end_date')) if data.get('end_date') else None,
            reason=data.get('reason')
        )
        db.session.add(new_status_entry)
        db.session.commit()
        return {"message": "Status saved successfully."}
    return {"message": "Invalid subject type."}
