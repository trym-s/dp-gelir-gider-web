from flask import Blueprint, request, jsonify
from app.models import db, Expense, Payment, Income, IncomeReceipt, Customer
from sqlalchemy import func, extract, cast, Date
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

@summary_bp.route('/income_report_pivot', methods=['GET'])
def get_income_report_pivot():
    month_str = request.args.get("month") # Örn: "2025-07"
    if not month_str:
        return jsonify({"error": "Month parametresi zorunludur"}), 400

    try:
        year, month = map(int, month_str.split("-"))
        start_date = date(year, month, 1)
        end_date = start_date + relativedelta(months=1) - relativedelta(days=1)
    except ValueError:
        return jsonify({"error": "Geçersiz tarih formatı. Lütfen YYYY-AA formatını kullanın."}), 400

    # --- 1. KPI Hesaplamaları ---
    # Seçilen ayda kesilen faturaların toplam tutarı
    total_invoiced = db.session.query(func.sum(Income.total_amount)).filter(
        Income.issue_date.between(start_date, end_date)
    ).scalar() or 0
    
    # Seçilen ayda yapılan toplam tahsilat
    total_received_in_month = db.session.query(func.sum(IncomeReceipt.receipt_amount)).filter(
        IncomeReceipt.receipt_date.between(start_date, end_date)
    ).scalar() or 0

    # Ay sonu itibarıyla o ay kesilen faturalardan kalan alacak
    remaining_from_month_invoices = db.session.query(func.sum(Income.remaining_amount)).filter(
        Income.issue_date.between(start_date, end_date)
    ).scalar() or 0

    customer_count = db.session.query(func.count(func.distinct(Income.customer_id))).filter(
        Income.issue_date.between(start_date, end_date)
    ).scalar() or 0

    kpis = {
        "total_invoiced": float(total_invoiced),
        "total_received": float(total_received_in_month),
        "remaining": float(remaining_from_month_invoices),
        "customer_count": customer_count
    }

    # --- 2. Pivot Tablo Verisi ---
    # Ay içindeki tüm tahsilatları müşteri ve güne göre gruplayalım
    receipts_by_day = db.session.query(
        Customer.name.label('customer_name'),
        extract('day', IncomeReceipt.receipt_date).label('day'),
        func.sum(IncomeReceipt.receipt_amount).label('daily_total')
    ).join(Income, Income.id == IncomeReceipt.income_id)\
     .join(Customer, Customer.id == Income.customer_id)\
     .filter(IncomeReceipt.receipt_date.between(start_date, end_date))\
     .group_by(Customer.name, extract('day', IncomeReceipt.receipt_date))\
     .all()

    # Veriyi pivot formatına çevirelim
    pivot_data = {}
    for receipt in receipts_by_day:
        customer = receipt.customer_name
        if customer not in pivot_data:
            pivot_data[customer] = {"customer_name": customer}
        pivot_data[customer][int(receipt.day)] = float(receipt.daily_total)

    # Toplamları hesaplayalım
    for customer, data in pivot_data.items():
        total = sum(v for k, v in data.items() if isinstance(k, int))
        pivot_data[customer]['total'] = total
    
    return jsonify({
        "kpis": kpis,
        "pivot_data": list(pivot_data.values())
    })
