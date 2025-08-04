from flask import Blueprint, request, jsonify
from app import db
from app.expense.models import Expense
from app.income.models import Income, IncomeReceipt
from app.budget_item.models import BudgetItem
from app.region.models import Region
from app.account_name.models import AccountName
from app.customer.models import Customer
from sqlalchemy import func, case, extract
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging

summary_bp = Blueprint('summary', __name__, url_prefix='/api')

def parse_dates():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
    except (ValueError, TypeError):
        return None, None, jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400

    if not start_date or not end_date:
        today = date.today()
        start_date = today.replace(day=1)
        end_date = today
        
    return start_date, end_date, None, None

@summary_bp.route('/summary', methods=['GET'])
def get_summary():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        total_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.date.between(start_date, end_date)
        ).scalar() or 0

        total_expense_remaining = db.session.query(func.sum(Expense.remaining_amount)).filter(
            Expense.date.between(start_date, end_date)
        ).scalar() or 0
        
        total_payments = total_expenses - total_expense_remaining

        total_income = db.session.query(func.sum(Income.total_amount)).filter(
            Income.issue_date.between(start_date, end_date)
        ).scalar() or 0

        total_income_remaining_query = db.session.query(func.sum(Income.total_amount - Income.received_amount)).filter(
            Income.issue_date.between(start_date, end_date)
        )
        total_income_remaining = total_income_remaining_query.scalar() or 0

        total_received = total_income - total_income_remaining

        return jsonify({
            "total_expenses": float(total_expenses),
            "total_payments": float(total_payments),
            "total_expense_remaining": float(total_expense_remaining),
            "total_income": float(total_income),
            "total_received": float(total_received),
            "total_income_remaining": float(total_income_remaining)
        })
    except Exception as e:
        logging.exception("Error in get_summary")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/expense_report', methods=['GET'])
def get_expense_report():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        group_by = request.args.get('group_by')
        group_name = request.args.get('group_name')
        
        query = Expense.query.filter(Expense.date.between(start_date, end_date))

        if group_by and group_name:
            if group_by == 'budget_item':
                query = query.join(BudgetItem).filter(BudgetItem.name == group_name)
            elif group_by == 'region':
                query = query.join(Region).filter(Region.name == group_name)
            elif group_by == 'account_name':
                query = query.join(AccountName).filter(AccountName.name == group_name)

        expenses = query.all()

        total_expenses = sum(e.amount for e in expenses)
        total_expense_remaining = sum(e.remaining_amount for e in expenses)
        total_payments = total_expenses - total_expense_remaining

        details = [e.to_dict() for e in expenses]

        return jsonify({
            "summary": {
                "total_expenses": float(total_expenses),
                "total_payments": float(total_payments),
                "total_expense_remaining": float(total_expense_remaining),
            },
            "details": details
        })
    except Exception as e:
        logging.exception("Error in get_expense_report")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/income_report', methods=['GET'])
def get_income_report():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        group_by = request.args.get('group_by')
        group_name = request.args.get('group_name')

        query = Income.query.filter(Income.issue_date.between(start_date, end_date))

        if group_by and group_name:
            if group_by == 'budget_item':
                query = query.join(BudgetItem).filter(BudgetItem.name == group_name)
            elif group_by == 'region':
                query = query.join(Region).filter(Region.name == group_name)
            elif group_by == 'account_name':
                query = query.join(AccountName).filter(AccountName.name == group_name)
            elif group_by == 'customer':
                query = query.join(Customer).filter(Customer.name == group_name)

        incomes = query.all()

        total_income = sum(i.total_amount for i in incomes)
        total_received = sum(i.received_amount for i in incomes)
        total_income_remaining = total_income - total_received

        details = [i.to_dict() for i in incomes]

        return jsonify({
            "summary": {
                "total_income": float(total_income),
                "total_received": float(total_received),
                "total_income_remaining": float(total_income_remaining),
            },
            "details": details
        })
    except Exception as e:
        logging.exception("Error in get_income_report")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/expense_graph', methods=['GET'])
def get_expense_graph():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        expense_data = (db.session.query(
            Expense.date,
            func.sum(Expense.amount - Expense.remaining_amount),
            func.sum(Expense.remaining_amount)
        ).filter(Expense.date.between(start_date, end_date))
         .group_by(Expense.date)
         .order_by(Expense.date).all())

        data = [{"date": d.strftime('%Y-%m-%d'), "paid": float(paid), "remaining": float(rem)} for d, paid, rem in expense_data]
        return jsonify(data)
    except Exception as e:
        logging.exception("Error in get_expense_graph")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/expense_distribution', methods=['GET'])
def get_expense_distribution():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        group_by = request.args.get('group_by', 'budget_item')

        if group_by == 'budget_item':
            group_by_model = BudgetItem
            group_by_field = Expense.budget_item_id
        elif group_by == 'region':
            group_by_model = Region
            group_by_field = Expense.region_id
        elif group_by == 'account_name':
            group_by_model = AccountName
            group_by_field = Expense.account_name_id
        else:
            return jsonify({"error": "Invalid group_by parameter"}), 400

        distribution_data = (db.session.query(
            group_by_model.name,
            func.sum(Expense.amount - Expense.remaining_amount),
            func.sum(Expense.remaining_amount)
        ).join(group_by_model, group_by_field == group_by_model.id)
         .filter(Expense.date.between(start_date, end_date))
         .group_by(group_by_model.name).all())

        data = [{"name": name, "paid": float(paid), "remaining": float(rem)} for name, paid, rem in distribution_data]
        return jsonify(data)
    except Exception as e:
        logging.exception("Error in get_expense_distribution")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/income_graph', methods=['GET'])
def get_income_graph():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        income_data = (db.session.query(
            Income.issue_date,
            func.sum(Income.received_amount),
            func.sum(Income.total_amount - Income.received_amount)
        ).filter(Income.issue_date.between(start_date, end_date))
         .group_by(Income.issue_date)
         .order_by(Income.issue_date).all())

        data = [{"date": d.strftime('%Y-%m-%d'), "received": float(rec), "remaining": float(rem)} for d, rec, rem in income_data]
        return jsonify(data)
    except Exception as e:
        logging.exception("Error in get_income_graph")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/income_distribution', methods=['GET'])
def get_income_distribution():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        group_by = request.args.get('group_by', 'budget_item')

        if group_by == 'budget_item':
            group_by_model = BudgetItem
            group_by_field = Income.budget_item_id
        elif group_by == 'region':
            group_by_model = Region
            group_by_field = Income.region_id
        elif group_by == 'account_name':
            group_by_model = AccountName
            group_by_field = Income.account_name_id
        elif group_by == 'customer':
            group_by_model = Customer
            group_by_field = Income.customer_id
        else:
            return jsonify({"error": "Invalid group_by parameter"}), 400

        distribution_data = (db.session.query(
            group_by_model.name,
            func.sum(Income.received_amount),
            func.sum(Income.total_amount - Income.received_amount)
        ).join(group_by_model, group_by_field == group_by_model.id)
         .filter(Income.issue_date.between(start_date, end_date))
         .group_by(group_by_model.name).all())

        data = [{"name": name, "received": float(rec), "remaining": float(rem)} for name, rec, rem in distribution_data]
        return jsonify(data)
    except Exception as e:
        logging.exception("Error in get_income_distribution")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/combined_income_expense_graph', methods=['GET'])
def get_combined_income_expense_graph():
    start_date, end_date, error_response, error_code = parse_dates()
    if error_response:
        return error_response, error_code
    try:
        income_data = {d.strftime('%Y-%m-%d'): float(total) for d, total in db.session.query(
            Income.issue_date,
            func.sum(Income.total_amount)
        ).filter(Income.issue_date.between(start_date, end_date)).group_by(Income.issue_date).all()}

        expense_data = {d.strftime('%Y-%m-%d'): float(total) for d, total in db.session.query(
            Expense.date,
            func.sum(Expense.amount)
        ).filter(Expense.date.between(start_date, end_date)).group_by(Expense.date).all()}

        all_dates = sorted(list(set(income_data.keys()) | set(expense_data.keys())))

        data = []
        for d_str in all_dates:
            income = income_data.get(d_str, 0)
            expense = expense_data.get(d_str, 0)
            data.append({
                "date": d_str,
                "income": income,
                "expense": expense,
                "difference": income - expense
            })
        
        return jsonify(data)
    except Exception as e:
        logging.exception("Error in get_combined_income_expense_graph")
        return jsonify({"error": "An internal server error occurred."}), 500

@summary_bp.route('/income_report_pivot', methods=['GET'])
def get_income_report_pivot():
    # --- Olası tüm hataları yakalamak için try...except bloğu ekliyoruz ---
    try:
        month_str = request.args.get("month")
        if not month_str:
            return jsonify({"error": "Month parametresi zorunludur"}), 400

        try:
            year, month = map(int, month_str.split("-"))
            start_date = date(year, month, 1)
            end_date = start_date + relativedelta(months=1) - relativedelta(days=1)
        except ValueError:
            return jsonify({"error": "Geçersiz tarih formatı. Lütfen YYYY-AA formatını kullanın."}), 400

        # --- KPI Hesaplamaları ---
        total_invoiced = db.session.query(func.sum(Income.total_amount)).filter(
            Income.issue_date.between(start_date, end_date)
        ).scalar() or 0
        
        total_received_in_month = db.session.query(func.sum(IncomeReceipt.receipt_amount)).filter(
            IncomeReceipt.receipt_date.between(start_date, end_date)
        ).scalar() or 0

        remaining_from_month_invoices = db.session.query(func.sum(Income.total_amount - Income.received_amount)).filter(
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

        # --- Pivot Tablo Verisi ---
        receipts_by_day = db.session.query(
            Customer.name.label('customer_name'),
            extract('day', IncomeReceipt.receipt_date).label('day'),
            func.sum(IncomeReceipt.receipt_amount).label('daily_total')
        ).join(Income, Income.id == IncomeReceipt.income_id)\
         .join(Customer, Customer.id == Income.customer_id)\
         .filter(IncomeReceipt.receipt_date.between(start_date, end_date))\
         .group_by(Customer.name, extract('day', IncomeReceipt.receipt_date))\
         .all()

        pivot_data = {}
        for receipt in receipts_by_day:
            customer = receipt.customer_name
            if customer not in pivot_data:
                pivot_data[customer] = {"customer_name": customer}

            day_key = str(int(receipt.day))
            pivot_data[customer][day_key] = float(receipt.daily_total)

        for customer, data in pivot_data.items():

            total = sum(v for k, v in data.items() if k.isdigit())
            pivot_data[customer]['total'] = total
        
        return jsonify({
            "kpis": kpis,
            "pivot_data": list(pivot_data.values())
        })
    
    except Exception as e:
        # --- HATA OLURSA DETAYLARI HEM TERMİNALE HEM DE TARAYICIYA GÖNDER ---
        import traceback
        traceback.print_exc() # Bu, hatayı terminale yazdıracak
        return jsonify({
            "error": "Rapor oluşturulurken sunucuda bir hata oluştu.",
            "error_details": str(e) # Hatayı tarayıcıya da gönder
        }), 500