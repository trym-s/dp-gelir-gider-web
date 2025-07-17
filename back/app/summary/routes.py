from flask import Blueprint, request, jsonify
from app.models import db, Expense, Payment, Income, IncomeReceipt, BudgetItem
from sqlalchemy import func
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import random

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
    total_income_remaining_query = db.session.query(func.sum(Income.total_amount - Income.received_amount)).filter(
        Income.date.between(start_date, end_date)
    )
    total_income_remaining = total_income_remaining_query.scalar() or 0

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

@summary_bp.route('/expense_graph', methods=['GET'])
def get_expense_graph():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()

    mock_data = []
    current_date = start_date
    while current_date <= end_date:
        mock_data.append({
            "date": current_date.strftime('%Y-%m-%d'),
            "paid": random.randint(5000, 20000),
            "remaining": random.randint(0, 5000)
        })
        current_date += timedelta(days=1)
    return jsonify(mock_data)

@summary_bp.route('/expense_distribution', methods=['GET'])
def get_expense_distribution():
    mock_data = [
        {"budget_item_name": "Personel Maaşları", "paid": random.randint(50000, 80000), "remaining": random.randint(0, 10000)},
        {"budget_item_name": "Kira ve Faturalar", "paid": random.randint(20000, 40000), "remaining": random.randint(0, 5000)},
        {"budget_item_name": "Ofis Malzemeleri", "paid": random.randint(5000, 15000), "remaining": random.randint(0, 2000)},
        {"budget_item_name": "Pazarlama", "paid": random.randint(10000, 25000), "remaining": random.randint(0, 8000)},
        {"budget_item_name": "Vergi ve Harçlar", "paid": random.randint(15000, 30000), "remaining": random.randint(0, 3000)},
    ]
    return jsonify(mock_data)

@summary_bp.route('/income_graph', methods=['GET'])
def get_income_graph():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()

    mock_data = []
    current_date = start_date
    while current_date <= end_date:
        mock_data.append({
            "date": current_date.strftime('%Y-%m-%d'),
            "received": random.randint(7000, 25000),
            "remaining": random.randint(0, 6000)
        })
        current_date += timedelta(days=1)
    return jsonify(mock_data)

@summary_bp.route('/income_distribution', methods=['GET'])
def get_income_distribution():
    mock_data = [
        {"budget_item_name": "Yazılım Satışları", "received": random.randint(100000, 150000), "remaining": random.randint(0, 20000)},
        {"budget_item_name": "Danışmanlık Hizmetleri", "received": random.randint(50000, 90000), "remaining": random.randint(0, 15000)},
        {"budget_item_name": "Bakım ve Destek", "received": random.randint(30000, 60000), "remaining": random.randint(0, 10000)},
        {"budget_item_name": "Eğitim Gelirleri", "received": random.randint(10000, 20000), "remaining": random.randint(0, 5000)},
    ]
    return jsonify(mock_data)

@summary_bp.route('/combined_income_expense_graph', methods=['GET'])
def get_combined_income_expense_graph():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
    mock_data = []
    current_date = start_date
    while current_date <= end_date:
        income = random.randint(7000, 25000)
        expense = random.randint(5000, 20000)
        mock_data.append({
            "date": current_date.strftime('%Y-%m-%d'),
            "income": income,
            "expense": expense,
            "difference": income - expense
        })
        current_date += timedelta(days=1)
    return jsonify(mock_data)

