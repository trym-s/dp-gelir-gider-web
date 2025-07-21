from app import db
from app.models import Loan, LoanType


def get_all_loans():
    return Loan.query.all()


def add_or_update_loan(data):
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
