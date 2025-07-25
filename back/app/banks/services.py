import logging
from .models import db, Bank, BankAccount, DailyBalance, AccountStatusHistory
from app.credit_cards.models import CreditCard
from app.loans.models import Loan
from app.bank_logs.models import BankLog
from sqlalchemy import func, and_
from decimal import Decimal
from datetime import date, datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Döviz kuru çevrimi için bir yardımcı fonksiyon (varsayımsal)
# Gerçek bir uygulamada bu veriyi bir API'den veya veritabanından alırsınız.
def get_exchange_rates():
    return {"USD": 30.0, "EUR": 32.0, "TRY": 1.0}

def get_bank_summary(bank_id):
    logger.info(f"--- Starting get_bank_summary for bank_id: {bank_id} ---")
    summary = {
        "total_assets_in_try": 0.0,
        "total_credit_card_debt": 0.0,
        "total_loan_debt": 0.0
    }

    try:
        # --- 1. Bu Bankadaki Toplam Varlığı Hesapla (Yeni Mantık) ---
        logger.info("Step 1: Calculating Total Assets from latest logs for each account")
        
        # İlgili bankaya ait tüm banka hesaplarının ID'lerini al
        account_ids = [acc.id for acc in BankAccount.query.filter_by(bank_id=bank_id).all()]
        logger.info(f"Found account IDs: {account_ids}")
        
        if account_ids:
            # Her bir hesap için en son tarihli logu bul
            subquery = db.session.query(
                BankLog.bank_account_id,
                func.max(BankLog.date).label('max_date')
            ).filter(BankLog.bank_account_id.in_(account_ids)).group_by(BankLog.bank_account_id).subquery()

            latest_logs = db.session.query(BankLog).join(
                subquery,
                (BankLog.bank_account_id == subquery.c.bank_account_id) &
                (BankLog.date == subquery.c.max_date)
            ).all()
            logger.info(f"Found {len(latest_logs)} latest bank logs for accounts.")

            rates = get_exchange_rates()
            total_assets = Decimal('0.0')
            for log in latest_logs:
                logger.debug(f"Processing log for account {log.bank_account_id}: TRY={log.amount_try}, USD={log.amount_usd}, EUR={log.amount_eur}")
                total_assets += (log.amount_try or Decimal('0.0')) * Decimal(str(rates.get("TRY", 1.0)))
                total_assets += (log.amount_usd or Decimal('0.0')) * Decimal(str(rates.get("USD", 30.0)))
                total_assets += (log.amount_eur or Decimal('0.0')) * Decimal(str(rates.get("EUR", 32.0)))
            
            summary["total_assets_in_try"] = float(total_assets)
            logger.info(f"Calculated total assets: {summary['total_assets_in_try']}")
        else:
            logger.info("No bank accounts found for this bank.")

        # --- 2. Toplam Kredi Kartı Borcunu Hesapla ---
        logger.info("Step 2: Calculating Total Credit Card Debt")
        card_debt = db.session.query(func.sum(CreditCard.current_debt))\
            .join(BankAccount, CreditCard.bank_account_id == BankAccount.id)\
            .filter(BankAccount.bank_id == bank_id)\
            .scalar()
        logger.info(f"Raw credit card debt from DB: {card_debt}")
        summary["total_credit_card_debt"] = float(card_debt) if card_debt else 0.0
        logger.info(f"Calculated total credit card debt: {summary['total_credit_card_debt']}")

        # --- 3. Toplam Kredi Borcunu Hesapla ---
        logger.info("Step 3: Calculating Total Loan Debt")
        loan_debt = db.session.query(func.sum(Loan.remaining_principal))\
            .join(BankAccount, Loan.bank_account_id == BankAccount.id)\
            .filter(BankAccount.bank_id == bank_id)\
            .scalar()
        logger.info(f"Raw loan debt from DB: {loan_debt}")
        summary["total_loan_debt"] = float(loan_debt) if loan_debt else 0.0
        logger.info(f"Calculated total loan debt: {summary['total_loan_debt']}")

    except Exception as e:
        logger.exception(f"An error occurred during get_bank_summary for bank_id: {bank_id}")
        raise

    logger.info(f"--- Finished get_bank_summary. Returning: {summary} ---")
    return summary

def get_all_banks():
    return Bank.query.all()

def create_bank(data):
    bank = Bank(name=data.get('name'), logo_url=data.get('logo_url'))
    db.session.add(bank)
    db.session.commit()
    return bank

def get_bank_by_id(bank_id):
    return Bank.query.get(bank_id)

def update_bank(bank_id, data):
    bank = get_bank_by_id(bank_id)
    if bank:
        bank.name = data.get('name', bank.name)
        bank.logo_url = data.get('logo_url', bank.logo_url)
        db.session.commit()
        return bank
    return None

def delete_bank(bank_id):
    bank = get_bank_by_id(bank_id)
    if bank:
        db.session.delete(bank)
        db.session.commit()
        return True
    return False

def get_all_bank_accounts():
    return BankAccount.query.all()

def create_bank_account(data):
    bank_account = BankAccount(
        name=data.get('name'),
        bank_id=data.get('bank_id'),
        iban_number=data.get('iban_number'),
        overdraft_limit=data.get('overdraft_limit', 0)
    )
    db.session.add(bank_account)
    db.session.commit()
    return bank_account

def update_bank_account(account_id, data):
    account = get_bank_account_by_id(account_id)
    if account:
        account.name = data.get('name', account.name)
        account.overdraft_limit = data.get('overdraft_limit', account.overdraft_limit)
        account.bank_id = data.get('bank_id', account.bank_id)
        account.iban_number = data.get('iban_number', account.iban_number)
        # Ignore currency field if present, as it's not in the model
        # if 'currency' in data:
        #     pass 
        db.session.commit()
        return account
    return None

def get_bank_account_by_id(account_id):
    return BankAccount.query.get(account_id)

def update_bank_account(account_id, data):
    account = get_bank_account_by_id(account_id)
    if account:
        account.name = data.get('name', account.name)
        account.overdraft_limit = data.get('overdraft_limit', account.overdraft_limit)
        account.bank_id = data.get('bank_id', account.bank_id)
        account.iban_number = data.get('iban_number', account.iban_number)
        db.session.commit()
        return account
    return None

def delete_bank_account(account_id):
    account = get_bank_account_by_id(account_id)
    if account:
        db.session.delete(account)
        db.session.commit()
        return True
    return False

def get_accounts_with_status():
    logger.info("Attempting to fetch accounts with status.")
    try:
        accounts = BankAccount.query.all()
        result = []
        for account in accounts:
            logger.debug(f"Processing account: {account.name} (ID: {account.id})")
            current_status = account.status_history.filter(AccountStatusHistory.end_date == None).first()
            status = current_status.status if current_status else "Aktif"
            
            bank_name = account.bank.name if account.bank else "Bilinmiyor"
            logger.debug(f"Account {account.name} status: {status}, Bank: {bank_name}")

            result.append({
                "id": account.id,
                "name": account.name,
                "bank_id": account.bank_id,
                "bank_name": bank_name,
                "iban_number": account.iban_number,
                "status": status
            })
        logger.info("Successfully fetched accounts with status.")
        return result
    except Exception as e:
        logger.exception("Error in get_accounts_with_status service function:")
        raise # Hatanın yayılmasını sağlayın

def get_daily_balances(year, month):
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)

    balances = DailyBalance.query.filter(
        DailyBalance.date.between(start_date, end_date)
    ).all()

    result = []
    for balance in balances:
        result.append({
            "account_id": balance.account_id,
            "account_name": balance.account.name,
            "bank_name": balance.account.bank.name,
            "entry_date": balance.date.strftime('%Y-%m-%d'),
            "morning_balance": float(balance.morning_balance) if balance.morning_balance is not None else None,
            "evening_balance": float(balance.evening_balance) if balance.evening_balance is not None else None,
        })
    return result

def save_daily_entries(entries):
    for entry_data in entries:
        account = BankAccount.query.filter_by(name=entry_data['hesap']).first()
        if not account:
            logger.warning(f"Account not found for entry: {entry_data['hesap']}")
            continue

        entry_date = datetime.strptime(entry_data['tarih'], '%Y-%m-%d').date()

        daily_balance = DailyBalance.query.filter(and_(
            DailyBalance.account_id == account.id,
            DailyBalance.date == entry_date
        )).first()

        if daily_balance:
            if 'sabah' in entry_data and entry_data['sabah'] is not None:
                daily_balance.morning_balance = Decimal(str(entry_data['sabah']))
            if 'aksam' in entry_data and entry_data['aksam'] is not None:
                daily_balance.evening_balance = Decimal(str(entry_data['aksam']))
        else:
            daily_balance = DailyBalance(
                account_id=account.id,
                date=entry_date,
                morning_balance=Decimal(str(entry_data['sabah'])) if 'sabah' in entry_data and entry_data['sabah'] is not None else None,
                evening_balance=Decimal(str(entry_data['aksam'])) if 'aksam' in entry_data and entry_data['aksam'] is not None else None
            )
            db.session.add(daily_balance)
    db.session.commit()

def get_status_history_for_account(account_id):
    history = AccountStatusHistory.query.filter_by(account_id=account_id).order_by(AccountStatusHistory.start_date.desc()).all()
    return history

def save_account_status(data):
    account_id = data.get('account_id')
    status = data.get('status')
    start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
    end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date() if data.get('end_date') else None
    reason = data.get('reason')

    # Close any existing open status for the account
    current_open_status = AccountStatusHistory.query.filter(
        and_(
            AccountStatusHistory.account_id == account_id,
            AccountStatusHistory.end_date == None
        )
    ).first()

    if current_open_status:
        current_open_status.end_date = start_date - timedelta(days=1) # End the previous status one day before the new one starts
        db.session.add(current_open_status)

    new_status_entry = AccountStatusHistory(
        account_id=account_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        reason=reason
    )
    db.session.add(new_status_entry)
    db.session.commit()
    return new_status_entry
