from .models import db, Bank, BankAccount

def get_all_banks():
    return Bank.query.all()

def create_bank(data):
    bank = Bank(**data)
    db.session.add(bank)
    db.session.commit()
    return bank

def get_all_bank_accounts():
    return BankAccount.query.all()

def create_bank_account(data):
    bank_account = BankAccount(**data)
    db.session.add(bank_account)
    db.session.commit()
    return bank_account
