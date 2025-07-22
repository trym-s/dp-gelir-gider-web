from app import db
from .models import Loan, LoanType

# Loan Services
def get_all_loans():
    return Loan.query.all()

def get_loan_by_id(loan_id):
    return Loan.query.get(loan_id)

def create_loan(data):
    new_loan = Loan(**data)
    db.session.add(new_loan)
    db.session.commit()
    return new_loan

def update_loan(loan_id, data):
    loan = get_loan_by_id(loan_id)
    if loan:
        for key, value in data.items():
            setattr(loan, key, value)
        db.session.commit()
    return loan

def delete_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if loan:
        db.session.delete(loan)
        db.session.commit()
    return loan

# LoanType Services
def get_all_loan_types():
    return LoanType.query.all()

def get_loan_type_by_id(loan_type_id):
    return LoanType.query.get(loan_type_id)

def create_loan_type(data):
    new_loan_type = LoanType(name=data['name'])
    db.session.add(new_loan_type)
    db.session.commit()
    return new_loan_type

def update_loan_type(loan_type_id, data):
    loan_type = get_loan_type_by_id(loan_type_id)
    if loan_type:
        loan_type.name = data.get('name', loan_type.name)
        db.session.commit()
    return loan_type

def delete_loan_type(loan_type_id):
    loan_type = get_loan_type_by_id(loan_type_id)
    if loan_type:
        db.session.delete(loan_type)
        db.session.commit()
    return loan_type