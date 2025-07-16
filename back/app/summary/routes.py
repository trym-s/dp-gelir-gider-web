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

    # --- Gider Hesaplamaları (Accrual-based) ---
    # Seçilen döneme ait toplam gider tutarı
    total_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.date.between(start_date, end_date)
    ).scalar() or 0

    # Bu giderlerden ne kadarının hala ödenmediği
    total_expense_remaining = db.session.query(func.sum(Expense.remaining_amount)).filter(
        Expense.date.between(start_date, end_date)
    ).scalar() or 0
    
    # Ödenen tutar, toplamdan kalanın çıkarılmasıyla bulunur. Bu, tutarlılık sağlar.
    total_payments = total_expenses - total_expense_remaining

    # --- Gelir Hesaplamaları (Accrual-based) ---
    # Seçilen döneme ait toplam gelir tutarı
    total_income = db.session.query(func.sum(Income.total_amount)).filter(
        Income.date.between(start_date, end_date)
    ).scalar() or 0

    # Bu gelirlerden ne kadarının hala tahsil edilmediği
    total_income_remaining = db.session.query(func.sum(Income.remaining_amount)).filter(
        Income.date.between(start_date, end_date)
    ).scalar() or 0

    # Tahsil edilen tutar, toplamdan kalanın çıkarılmasıyla bulunur.
    total_received = total_income - total_income_remaining

    return jsonify({
        "total_expenses": float(total_expenses),
        "total_payments": float(total_payments),
        "total_expense_remaining": float(total_expense_remaining),
        "total_income": float(total_income),
        "total_received": float(total_received),
        "total_income_remaining": float(total_income_remaining)
    })

@summary_bp.route('/expense_report', methods=['GET'])
def get_expense_report():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400
    else:
        today = date.today()
        start_date = today.replace(day=1)
        end_date = start_date + relativedelta(months=1) - relativedelta(days=1)

    # Fetch all expenses in the date range
    expenses = Expense.query.filter(Expense.date.between(start_date, end_date)).all()

    # Calculate summary from the fetched expenses
    total_expenses = sum(e.amount for e in expenses)
    total_expense_remaining = sum(e.remaining_amount for e in expenses)
    total_payments = total_expenses - total_expense_remaining

    # Serialize expense details
    details = [e.to_dict() for e in expenses]

    return jsonify({
        "summary": {
            "total_expenses": float(total_expenses),
            "total_payments": float(total_payments),
            "total_expense_remaining": float(total_expense_remaining),
        },
        "details": details
    })

@summary_bp.route('/income_report', methods=['GET'])
def get_income_report():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400
    else:
        today = date.today()
        start_date = today.replace(day=1)
        end_date = start_date + relativedelta(months=1) - relativedelta(days=1)

    # Fetch all incomes in the date range
    incomes = Income.query.filter(Income.date.between(start_date, end_date)).all()

    # Calculate summary from the fetched incomes
    total_income = sum(i.total_amount for i in incomes)
    total_received = sum(i.received_amount for i in incomes)
    total_income_remaining = total_income - total_received

    # Serialize income details
    details = [i.to_dict() for i in incomes]

    return jsonify({
        "summary": {
            "total_income": float(total_income),
            "total_received": float(total_received),
            "total_income_remaining": float(total_income_remaining),
        },
        "details": details
    })

from collections import defaultdict
from flask import request

@summary_bp.route('/chart/income', methods=['GET'])
def get_income_chart_data():
    start_date_str = request.args.get('date_start')
    end_date_str = request.args.get('date_end')
    group_by = request.args.get('group_by', 'month')  # day | week | month

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    query = db.session.query(Income.date, Income.total_amount, Income.received_amount).filter(
        Income.date.between(start_date, end_date)
    )

    grouped_data = defaultdict(lambda: {'received': 0, 'remaining': 0})

    for i in query:
        if group_by == 'day':
            key = i.date.strftime('%Y-%m-%d')
        elif group_by == 'week':
            year, week, _ = i.date.isocalendar()
            key = f'{year}-W{week:02d}'
        else:  # month
            key = i.date.strftime('%Y-%m')

        grouped_data[key]['received'] += i.received_amount
        grouped_data[key]['remaining'] += i.total_amount - i.received_amount

    response = [{'date': k, 'received': v['received'], 'remaining': v['remaining']} for k, v in grouped_data.items()]
    return jsonify(sorted(response, key=lambda x: x['date']))

@summary_bp.route('/chart/expense', methods=['GET'])
def get_expense_chart_data():
    start_date_str = request.args.get('date_start')
    end_date_str = request.args.get('date_end')
    group_by = request.args.get('group_by', 'month')  # day | week | month

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    query = db.session.query(Expense.date, Expense.amount, Expense.remaining_amount).filter(
        Expense.date.between(start_date, end_date)
    )

    grouped_data = defaultdict(lambda: {'paid': 0, 'remaining': 0})

    for e in query:
        if group_by == 'day':
            key = e.date.strftime('%Y-%m-%d')
        elif group_by == 'week':
            year, week, _ = e.date.isocalendar()
            key = f'{year}-W{week:02d}'
        else:
            key = e.date.strftime('%Y-%m')

        paid = e.amount - e.remaining_amount
        grouped_data[key]['paid'] += paid
        grouped_data[key]['remaining'] += e.remaining_amount

    response = [{'date': k, 'paid': v['paid'], 'remaining': v['remaining']} for k, v in grouped_data.items()]
    return jsonify(sorted(response, key=lambda x: x['date']))
