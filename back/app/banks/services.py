import logging
from .models import db, Bank, BankAccount

# Configure logging
logging.basicConfig(level=logging.INFO)

def get_all_banks():
    return Bank.query.all()

def create_bank(data):
    bank = Bank()
    for key, value in data.items():
        setattr(bank, key, value)
    db.session.add(bank)
    db.session.commit()
    return bank

def get_bank_by_id(bank_id):
    return Bank.query.get(bank_id)

def update_bank(bank_id, data):
    logging.info(f"Attempting to update bank with ID: {bank_id}")
    logging.info(f"Incoming data: {data}")
    bank = get_bank_by_id(bank_id)
    if bank:
        try:
            for key, value in data.items():
                logging.info(f"Setting {key} = {value} for bank {bank_id}")
                setattr(bank, key, value)
            db.session.commit()
            logging.info(f"Successfully committed changes for bank {bank_id}")
            return bank
        except Exception as e:
            logging.error(f"Error updating bank {bank_id}: {e}", exc_info=True)
            db.session.rollback()
            raise
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
    bank_account = BankAccount()
    for key, value in data.items():
        setattr(bank_account, key, value)
    db.session.add(bank_account)
    db.session.commit()
    return bank_account

def get_bank_account_by_id(account_id):
    return BankAccount.query.get(account_id)

def update_bank_account(account_id, data):
    logging.info(f"Attempting to update bank account with ID: {account_id}")
    logging.info(f"Incoming data: {data}")
    account = get_bank_account_by_id(account_id)
    if account:
        try:
            for key, value in data.items():
                logging.info(f"Setting {key} = {value} for account {account_id}")
                setattr(account, key, value)
            db.session.commit()
            logging.info(f"Successfully committed changes for account {account_id}")
            return account
        except Exception as e:
            logging.error(f"Error updating bank account {account_id}: {e}", exc_info=True)
            db.session.rollback()
            raise
    return None

def delete_bank_account(account_id):
    account = get_bank_account_by_id(account_id)
    if account:
        db.session.delete(account)
        db.session.commit()
        return True
    return False
