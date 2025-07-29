from app.banks.models import Bank, BankAccount
from app.loans.models import Loan, LoanPayment
from app.credit_cards.models import CreditCard
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from app import db


def get_banks_with_accounts_data():
    """
    Fetches all banks and their associated accounts, structured for dashboard display.
    Note: joinedload is removed because Bank.accounts is a lazy='dynamic' relationship.
    """
    banks = Bank.query.order_by(Bank.name).all()

    # Manually serialize to the desired structure
    result = []
    # Schemas are not used here to construct the exact desired output
    # bank_schema = BankSchema()
    # account_schema = BankAccountSchema(many=True)

    for bank in banks:
        # Accessing bank.accounts here will trigger a separate query for each bank
        accounts_data = [
            {
                "id": acc.id,
                "name": acc.name,
                "iban": getattr(acc, 'iban', None),  # Safely access iban
                "currency": getattr(acc, 'currency', 'TRY')  # Safely access currency
            } for acc in bank.accounts
        ]

        bank_data = {
            "id": bank.id,
            "name": bank.name,
            "logo_url": bank.logo_url,
            "accounts": accounts_data
        }
        result.append(bank_data)

    return result


def get_loan_summary_by_bank():
    """
    Her banka için toplam kredi tutarını ve ödenen tutarı hesaplar.
    """
    loan_summary = {}

    # Tüm kredileri banka bilgileriyle birlikte çek
    loans = db.session.query(Loan).options(
        joinedload(Loan.bank_account).joinedload(BankAccount.bank)
    ).all()

    for loan in loans:
        bank_name = loan.bank_account.bank.name
        if bank_name not in loan_summary:
            loan_summary[bank_name] = {
                "total_loan_amount": 0,
                "total_paid_amount": 0
            }

        loan_summary[bank_name]["total_loan_amount"] += float(loan.amount_drawn)

        # Krediye ait ödemelerin toplamını al
        total_paid_for_loan = db.session.query(func.sum(LoanPayment.amount_paid)).filter(
            LoanPayment.loan_id == loan.id
        ).scalar() or 0

        loan_summary[bank_name]["total_paid_amount"] += float(total_paid_for_loan)

    return loan_summary

def get_credit_card_summary_by_bank():
    """
    Her banka için toplam kredi kartı limiti ve toplam güncel borcu hesaplar.
    """
    credit_card_summary = {}

    # Tüm kredi kartlarını banka bilgileriyle birlikte çek
    credit_cards = db.session.query(CreditCard).options(
        joinedload(CreditCard.bank_account).joinedload(BankAccount.bank)
    ).all()

    for card in credit_cards:
        bank_name = card.bank_account.bank.name
        if bank_name not in credit_card_summary:
            credit_card_summary[bank_name] = {
                "total_credit_limit": 0,
                "total_current_debt": 0
            }

        credit_card_summary[bank_name]["total_credit_limit"] += float(card.limit)
        credit_card_summary[bank_name]["total_current_debt"] += float(card.current_debt)

    return credit_card_summary
