from app import db
from app.models import Bank, Loan, LoanType


def get_all_loans():
    loans = Loan.query.join(Bank).join(LoanType).all()
    result = []
    for loan in loans:
        result.append({
            "id": loan.id,
            "bank_id": loan.bank_id,
            "bank": loan.bank.name,  # ← EKLENDİ
            "loan_type_id": loan.loan_type_id,
            "loanType": loan.loan_type.name,  # ← EKLENDİ
            "description": loan.description,
            "amount": loan.amount,
            "monthlyRate": loan.monthly_rate,
            "yearlyRate": loan.yearly_rate,
            "issueDate": str(loan.issue_date),
            "dueDate": str(loan.due_date),
            "installmentCount": loan.installment_count,
            "totalDebt": loan.total_debt,
            "totalPaid": loan.total_paid
        })
    return result

def add_or_update_loan(data):
    mapping = {
        'monthlyRate': 'monthly_rate',
        'yearlyRate': 'yearly_rate',
        'issueDate': 'issue_date',
        'dueDate': 'due_date',
        'installmentCount': 'installment_count',
        'totalDebt': 'total_debt',
        'totalPaid': 'total_paid'
    }
    for old, new in mapping.items():
        if old in data:
            data[new] = data.pop(old)

    bank_name = data.pop('bank', None)
    if bank_name:
        bank = Bank.query.filter_by(name=bank_name).first()
        if not bank:
            bank = Bank(name=bank_name)
            db.session.add(bank)
            db.session.commit()
        data['bank_id'] = bank.id

    loan_type_name = data.pop('loanType', None)
    if loan_type_name:
        loan_type = LoanType.query.filter_by(name=loan_type_name).first()
        if not loan_type:
            loan_type = LoanType(name=loan_type_name)
            db.session.add(loan_type)
            db.session.commit()
        data['loan_type_id'] = loan_type.id

    # 🔥 Gereksiz frontend alanlarını temizle
    data.pop('monthlyPayment', None)

    loan_id = data.get('id')
    if loan_id:
        loan = Loan.query.get(loan_id)
        for key, value in data.items():
            setattr(loan, key, value)
    else:
        loan = Loan(**data)
        db.session.add(loan)

    db.session.commit()
    return loan


def delete_loan(loan_id):
    loan = Loan.query.get(loan_id)
    if loan:
        db.session.delete(loan)
        db.session.commit()


def get_all_loan_types():
    return LoanType.query.all()


def add_loan_type(name):
    loan_type = LoanType(name=name)
    db.session.add(loan_type)
    db.session.commit()
    return loan_type
