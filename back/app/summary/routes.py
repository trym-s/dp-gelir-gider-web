from flask import Blueprint, request, jsonify
from app.models import db, Expense, Payment, Income, IncomeReceipt
from sqlalchemy import func
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

summary_bp = Blueprint('summary', __name__, url_prefix='/api')

@summary_bp.route('/summary', methods=['GET'])
def get_summary():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400
    else:
        # Eğer tarih parametreleri yoksa, içinde bulunulan ayı varsayılan olarak kullan
        today = date.today()
        start_date = today.replace(day=1)
        end_date = start_date + relativedelta(months=1) - relativedelta(days=1)

    # Expense calculations
    total_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    ).scalar() or 0

    # Ödemeleri, kendi ödeme tarihlerine göre filtrele
    total_payments = db.session.query(func.sum(Payment.payment_amount)).filter(
        Payment.payment_date >= start_date,
        Payment.payment_date <= end_date
    ).scalar() or 0

    total_expense_remaining = total_expenses - total_payments

    # Income calculations
    total_income = db.session.query(func.sum(Income.total_amount)).filter(
        Income.date >= start_date,
        Income.date <= end_date
    ).scalar() or 0

    # Tahsilatları, kendi tahsilat tarihlerine göre filtrele
    total_received = db.session.query(func.sum(IncomeReceipt.receipt_amount)).filter(
        IncomeReceipt.receipt_date >= start_date,
        IncomeReceipt.receipt_date <= end_date
    ).scalar() or 0

    total_income_remaining = total_income - total_received

    return jsonify({
        "total_expenses": float(total_expenses),
        "total_payments": float(total_payments),
        "total_expense_remaining": float(total_expense_remaining),
        "total_income": float(total_income),
        "total_received": float(total_received),
        "total_income_remaining": float(total_income_remaining)
    })
