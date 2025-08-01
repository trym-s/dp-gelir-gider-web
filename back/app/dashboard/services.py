from app.banks.models import Bank, BankAccount
from app.loans.models import Loan, LoanPayment
from app.credit_cards.models import CreditCard
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from app import db
from app.expense.models import Expense
from app.income.models import Income
from datetime import datetime

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
def get_recent_transactions(limit=5):
    """
    Veritabanından en son eklenen giderleri ve gelirleri birleştirip,
    ilgili tarih alanlarına göre sıralanmış tek bir liste olarak döndürür.
    """
    # Giderleri 'date' (vade tarihi) kolonuna göre en yeniden eskiye sırala
    recent_expenses = Expense.query.order_by(Expense.date.desc()).limit(limit).all()

    # Gelirleri 'created_at' (oluşturulma tarihi) kolonuna göre sırala
    recent_incomes = Income.query.order_by(Income.created_at.desc()).limit(limit).all()

    transactions = []
    for expense in recent_expenses:
        transactions.append({
            "id": f"expense-{expense.id}",
            "type": "GİDER",
            "description": expense.description,
            "amount": float(expense.amount),
            # Giderler için 'date' alanını kullanıyoruz
            "date": expense.date.isoformat() if expense.date else datetime.utcnow().isoformat()
        })

    for income in recent_incomes:
        transactions.append({
            "id": f"income-{income.id}",
            "type": "GELİR",
            "description": income.invoice_name,
            "amount": float(income.total_amount),
            # Gelirler için 'created_at' alanını kullanıyoruz
            "date": income.created_at.isoformat() if income.created_at else datetime.utcnow().isoformat()
        })

    # Tüm işlemleri 'date' anahtarına göre yeniden sırala (en yeniden en eskiye)
    sorted_transactions = sorted(transactions, key=lambda t: t['date'], reverse=True)

    # Sadece en son 'limit' kadarını geri döndür
    return sorted_transactions[:limit]