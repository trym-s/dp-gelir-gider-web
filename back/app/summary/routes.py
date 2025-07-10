from flask import Blueprint, request, jsonify
from app.models import db, Expense, Payment
from sqlalchemy import func
from datetime import date
from dateutil.relativedelta import relativedelta

summary_bp = Blueprint('summary', __name__, url_prefix='/api')

@summary_bp.route('/summary', methods=['GET'])
def get_summary():
    month_str = request.args.get('month')
    
    if month_str:
        try:
            year, month = map(int, month_str.split('-'))
            start_of_month = date(year, month, 1)
        except ValueError:
            return jsonify({"error": "Invalid month format. Please use YYYY-MM."}), 400
    else:
        today = date.today()
        start_of_month = today.replace(day=1)

    # Determine the end of the month (start of next month)
    end_of_month = start_of_month + relativedelta(months=1)

    total_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.date >= start_of_month,
        Expense.date < end_of_month
    ).scalar() or 0

    total_remaining = db.session.query(func.sum(Expense.remaining_amount)).filter(
        Expense.date >= start_of_month,
        Expense.date < end_of_month
    ).scalar() or 0

    total_payments = db.session.query(func.sum(Payment.payment_amount)).join(Expense).filter(
        Expense.date >= start_of_month,
        Expense.date < end_of_month
    ).scalar() or 0

    return jsonify({
        "total_expenses": float(total_expenses),
        "total_remaining_amount": float(total_remaining),
        "total_payments": float(total_payments)
    })