from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from app import db
from app.expense.models import Expense
from app.income.models import Income

def get_date_range(start_date_str, end_date_str):
    """Parses date strings or defaults to the current month."""
    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            return start_date, end_date
        except ValueError:
            raise ValueError("Invalid date format. Please use YYYY-MM-DD.")
    else:
        today = date.today()
        start_date = today.replace(day=1)
        end_date = start_date + relativedelta(months=1) - relativedelta(days=1)
        return start_date, end_date

def calculate_financial_summary(start_date, end_date):
    """Calculates the main financial summary for a given date range."""
    # --- Expense Calculations (Accrual-based) ---
    total_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.date.between(start_date, end_date)
    ).scalar() or 0

    total_expense_remaining = db.session.query(func.sum(Expense.remaining_amount)).filter(
        Expense.date.between(start_date, end_date)
    ).scalar() or 0
    
    total_payments = total_expenses - total_expense_remaining

    # --- Income Calculations (Accrual-based) ---
    total_income = db.session.query(func.sum(Income.total_amount)).filter(
        Income.date.between(start_date, end_date)
    ).scalar() or 0

    total_income_remaining = db.session.query(func.sum(Income.remaining_amount)).filter(
        Income.date.between(start_date, end_date)
    ).scalar() or 0

    total_received = total_income - total_income_remaining

    return {
        "total_expenses": float(total_expenses),
        "total_payments": float(total_payments),
        "total_expense_remaining": float(total_expense_remaining),
        "total_income": float(total_income),
        "total_received": float(total_received),
        "total_income_remaining": float(total_income_remaining)
    }

def generate_expense_report_data(start_date, end_date):
    """Generates a detailed expense report."""
    expenses = Expense.query.filter(Expense.date.between(start_date, end_date)).order_by(Expense.date.desc()).all()

    total_expenses = sum(e.amount for e in expenses)
    total_expense_remaining = sum(e.remaining_amount for e in expenses)
    total_payments = total_expenses - total_expense_remaining

    # Assuming Expense model has a to_dict() method for serialization
    details = [e.to_dict() for e in expenses]

    return {
        "summary": {
            "total_expenses": float(total_expenses),
            "total_payments": float(total_payments),
            "total_expense_remaining": float(total_expense_remaining),
        },
        "details": details
    }

def generate_income_report_data(start_date, end_date):
    """Generates a detailed income report."""
    incomes = Income.query.filter(Income.date.between(start_date, end_date)).order_by(Income.date.desc()).all()

    total_income = sum(i.total_amount for i in incomes)
    # Assuming 'received_amount' is a property or a persisted field
    total_received = sum(i.received_amount for i in incomes)
    total_income_remaining = total_income - total_received

    # Assuming Income model has a to_dict() method for serialization
    details = [i.to_dict() for i in incomes]

    return {
        "summary": {
            "total_income": float(total_income),
            "total_received": float(total_received),
            "total_income_remaining": float(total_income_remaining),
        },
        "details": details
    }
