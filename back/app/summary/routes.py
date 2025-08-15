# app/summary/routes.py
from flask import Blueprint, request, jsonify
from app import db
from app.expense.models import Expense
from app.income.models import Income, IncomeReceipt
from app.budget_item.models import BudgetItem
from app.region.models import Region
from app.account_name.models import AccountName
from app.customer.models import Customer
from sqlalchemy import func, extract
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import logging

# ops-uyumlu structured logging yardımcıları (mevcut projede kullanılıyor)
try:
    from app.logging_utils import dinfo, dwarn, derr
except Exception:  # yoksa normal logger kullan
    def dinfo(evt, **kw): logging.getLogger(__name__).info("%s | %s", evt, kw)
    def dwarn(evt, **kw): logging.getLogger(__name__).warning("%s | %s", evt, kw)
    def derr(evt, **kw):  logging.getLogger(__name__).exception("%s | %s", evt, kw)

summary_bp = Blueprint('summary', __name__, url_prefix='/api')

# ---- yardımcılar ------------------------------------------------------------

def _flo(x):
    try:
        return float(x) if x is not None else 0.0
    except Exception:
        return 0.0

def _serialize_expense(e: Expense) -> dict:
    # Modelde to_dict varsa onu kullan, yoksa güvenli minimum alanlar
    if hasattr(e, "to_dict"):
        try:
            return e.to_dict()
        except Exception:
            pass
    return {
        "id": e.id,
        "description": getattr(e, "description", None),
        "amount": _flo(getattr(e, "amount", None)),
        "remaining_amount": _flo(getattr(e, "remaining_amount", None)),
        "date": getattr(e, "date", None).isoformat() if getattr(e, "date", None) else None,
        "region_id": getattr(e, "region_id", None),
        "budget_item_id": getattr(e, "budget_item_id", None),
        "account_name_id": getattr(e, "account_name_id", None),
    }

def _serialize_income(i: Income) -> dict:
    if hasattr(i, "to_dict"):
        try:
            return i.to_dict()
        except Exception:
            pass
    return {
        "id": i.id,
        "invoice_number": getattr(i, "invoice_number", None),
        "invoice_name": getattr(i, "invoice_name", None),
        "total_amount": _flo(getattr(i, "total_amount", None)),
        "received_amount": _flo(getattr(i, "received_amount", None)),
        "issue_date": getattr(i, "issue_date", None).isoformat() if getattr(i, "issue_date", None) else None,
        "due_date": getattr(i, "due_date", None).isoformat() if getattr(i, "due_date", None) else None,
        "region_id": getattr(i, "region_id", None),
        "budget_item_id": getattr(i, "budget_item_id", None),
        "account_name_id": getattr(i, "account_name_id", None),
        "customer_id": getattr(i, "customer_id", None),
    }

def _parse_dates():
    """?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD -> (start,end) | default: içinde bulunduğumuz ay."""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    try:
        start = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
    except (ValueError, TypeError):
        dwarn("summary.bad_dates", start=start_date_str, end=end_date_str)
        return None, None, jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400

    if not start or not end:
        today = date.today()
        start = today.replace(day=1)
        end = today
    return start, end, None, None

# ---- Endpoints --------------------------------------------------------------

@summary_bp.route('/summary', methods=['GET'])
def get_summary():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code
    try:
        dinfo("summary.summary.start", start=start_date.isoformat(), end=end_date.isoformat())

        total_expenses = db.session.query(func.sum(Expense.amount))\
            .filter(Expense.date.between(start_date, end_date)).scalar() or 0
        total_expense_remaining = db.session.query(func.sum(Expense.remaining_amount))\
            .filter(Expense.date.between(start_date, end_date)).scalar() or 0
        total_payments = (total_expenses or 0) - (total_expense_remaining or 0)

        total_income = db.session.query(func.sum(Income.total_amount))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0
        total_income_remaining = db.session.query(func.sum(Income.total_amount - (Income.received_amount or 0)))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0
        total_received = (total_income or 0) - (total_income_remaining or 0)

        out = {
            "timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "totals": {
                "total_expenses": _flo(total_expenses),
                "total_payments": _flo(total_payments),
                "total_expense_remaining": _flo(total_expense_remaining),
                "total_income": _flo(total_income),
                "total_received": _flo(total_received),
                "total_income_remaining": _flo(total_income_remaining),
            }
        }
        dinfo("summary.summary.done", **{k: v for k, v in out["totals"].items()})
        return jsonify(out), 200
    except Exception as e:
        derr("summary.summary.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/expense_report', methods=['GET'])
def get_expense_report():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code

    group_by = request.args.get('group_by')
    group_name = request.args.get('group_name')

    try:
        dinfo("summary.expense_report.start",
              start=start_date.isoformat(), end=end_date.isoformat(),
              group_by=group_by, group_name=group_name)

        query = Expense.query.filter(Expense.date.between(start_date, end_date))

        if group_by and group_name:
            if group_by == 'budget_item':
                query = query.join(BudgetItem).filter(BudgetItem.name == group_name)
            elif group_by == 'region':
                query = query.join(Region).filter(Region.name == group_name)
            elif group_by == 'account_name':
                query = query.join(AccountName).filter(AccountName.name == group_name)
            else:
                dwarn("summary.expense_report.bad_group_by", group_by=group_by)
                return jsonify({"error": "Invalid group_by parameter. Use one of: budget_item, region, account_name."}), 400

        expenses = query.all()

        total_expenses = sum((e.amount or 0) for e in expenses)
        total_expense_remaining = sum((e.remaining_amount or 0) for e in expenses)
        total_payments = (total_expenses or 0) - (total_expense_remaining or 0)

        details = [_serialize_expense(e) for e in expenses]

        out = {
            "timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "summary": {
                "total_expenses": _flo(total_expenses),
                "total_payments": _flo(total_payments),
                "total_expense_remaining": _flo(total_expense_remaining),
                "count": len(details),
            },
            "details": details
        }
        dinfo("summary.expense_report.done", count=len(details))
        return jsonify(out), 200
    except Exception as e:
        derr("summary.expense_report.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/income_report', methods=['GET'])
def get_income_report():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code

    group_by = request.args.get('group_by')
    group_name = request.args.get('group_name')

    try:
        dinfo("summary.income_report.start",
              start=start_date.isoformat(), end=end_date.isoformat(),
              group_by=group_by, group_name=group_name)

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
            else:
                dwarn("summary.income_report.bad_group_by", group_by=group_by)
                return jsonify({"error": "Invalid group_by parameter. Use one of: budget_item, region, account_name, customer."}), 400

        incomes = query.all()

        total_income = sum((i.total_amount or 0) for i in incomes)
        total_received = sum((i.received_amount or 0) for i in incomes)
        total_income_remaining = (total_income or 0) - (total_received or 0)

        details = [_serialize_income(i) for i in incomes]

        out = {
            "timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "summary": {
                "total_income": _flo(total_income),
                "total_received": _flo(total_received),
                "total_income_remaining": _flo(total_income_remaining),
                "count": len(details),
            },
            "details": details
        }
        dinfo("summary.income_report.done", count=len(details))
        return jsonify(out), 200
    except Exception as e:
        derr("summary.income_report.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/expense_graph', methods=['GET'])
def get_expense_graph():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code
    try:
        dinfo("summary.expense_graph.start", start=start_date.isoformat(), end=end_date.isoformat())
        rows = (db.session.query(
                    Expense.date,
                    func.sum((Expense.amount or 0) - (Expense.remaining_amount or 0)),
                    func.sum(Expense.remaining_amount or 0)
                )
                .filter(Expense.date.between(start_date, end_date))
                .group_by(Expense.date)
                .order_by(Expense.date)
                .all())
        data = [{"date": d.strftime('%Y-%m-%d'), "paid": _flo(paid), "remaining": _flo(rem)} for d, paid, rem in rows]
        dinfo("summary.expense_graph.done", points=len(data))
        return jsonify({"timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()}, "data": data}), 200
    except Exception as e:
        derr("summary.expense_graph.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/expense_distribution', methods=['GET'])
def get_expense_distribution():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code
    try:
        group_by = request.args.get('group_by', 'budget_item')

        if group_by == 'budget_item':
            model, field = BudgetItem, Expense.budget_item_id
        elif group_by == 'region':
            model, field = Region, Expense.region_id
        elif group_by == 'account_name':
            model, field = AccountName, Expense.account_name_id
        else:
            dwarn("summary.expense_distribution.bad_group_by", group_by=group_by)
            return jsonify({"error": "Invalid group_by parameter. Use one of: budget_item, region, account_name."}), 400

        dinfo("summary.expense_distribution.start",
              start=start_date.isoformat(), end=end_date.isoformat(), group_by=group_by)

        rows = (db.session.query(
                    model.name,
                    func.sum((Expense.amount or 0) - (Expense.remaining_amount or 0)),
                    func.sum(Expense.remaining_amount or 0)
                )
                .join(model, field == model.id)
                .filter(Expense.date.between(start_date, end_date))
                .group_by(model.name)
                .all())
        data = [{"name": name, "paid": _flo(paid), "remaining": _flo(rem)} for name, paid, rem in rows]
        dinfo("summary.expense_distribution.done", buckets=len(data))
        return jsonify({"timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()}, "group_by": group_by, "data": data}), 200
    except Exception as e:
        derr("summary.expense_distribution.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/income_graph', methods=['GET'])
def get_income_graph():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code
    try:
        dinfo("summary.income_graph.start", start=start_date.isoformat(), end=end_date.isoformat())
        rows = (db.session.query(
                    Income.issue_date,
                    func.sum(Income.received_amount or 0),
                    func.sum((Income.total_amount or 0) - (Income.received_amount or 0))
                )
                .filter(Income.issue_date.between(start_date, end_date))
                .group_by(Income.issue_date)
                .order_by(Income.issue_date)
                .all())
        data = [{"date": d.strftime('%Y-%m-%d'), "received": _flo(rec), "remaining": _flo(rem)} for d, rec, rem in rows]
        dinfo("summary.income_graph.done", points=len(data))
        return jsonify({"timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()}, "data": data}), 200
    except Exception as e:
        derr("summary.income_graph.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/income_distribution', methods=['GET'])
def get_income_distribution():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code
    try:
        group_by = request.args.get('group_by', 'budget_item')

        if group_by == 'budget_item':
            model, field = BudgetItem, Income.budget_item_id
        elif group_by == 'region':
            model, field = Region, Income.region_id
        elif group_by == 'account_name':
            model, field = AccountName, Income.account_name_id
        elif group_by == 'customer':
            model, field = Customer, Income.customer_id
        else:
            dwarn("summary.income_distribution.bad_group_by", group_by=group_by)
            return jsonify({"error": "Invalid group_by parameter. Use one of: budget_item, region, account_name, customer."}), 400

        dinfo("summary.income_distribution.start",
              start=start_date.isoformat(), end=end_date.isoformat(), group_by=group_by)

        rows = (db.session.query(
                    model.name,
                    func.sum(Income.received_amount or 0),
                    func.sum((Income.total_amount or 0) - (Income.received_amount or 0))
                )
                .join(model, field == model.id)
                .filter(Income.issue_date.between(start_date, end_date))
                .group_by(model.name)
                .all())
        data = [{"name": name, "received": _flo(rec), "remaining": _flo(rem)} for name, rec, rem in rows]
        dinfo("summary.income_distribution.done", buckets=len(data))
        return jsonify({"timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()}, "group_by": group_by, "data": data}), 200
    except Exception as e:
        derr("summary.income_distribution.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/combined_income_expense_graph', methods=['GET'])
def get_combined_income_expense_graph():
    start_date, end_date, err_resp, err_code = _parse_dates()
    if err_resp: return err_resp, err_code
    try:
        dinfo("summary.combined_graph.start", start=start_date.isoformat(), end=end_date.isoformat())

        income_map = {
            d.strftime('%Y-%m-%d'): _flo(total)
            for d, total in (db.session.query(
                                Income.issue_date, func.sum(Income.total_amount or 0))
                             .filter(Income.issue_date.between(start_date, end_date))
                             .group_by(Income.issue_date).all())
        }
        expense_map = {
            d.strftime('%Y-%m-%d'): _flo(total)
            for d, total in (db.session.query(
                                Expense.date, func.sum(Expense.amount or 0))
                             .filter(Expense.date.between(start_date, end_date))
                             .group_by(Expense.date).all())
        }

        all_dates = sorted(set(income_map.keys()) | set(expense_map.keys()))
        data = []
        for d_str in all_dates:
            income = income_map.get(d_str, 0.0)
            expense = expense_map.get(d_str, 0.0)
            data.append({
                "date": d_str,
                "income": income,
                "expense": expense,
                "difference": income - expense
            })

        dinfo("summary.combined_graph.done", points=len(data))
        return jsonify({"timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()}, "data": data}), 200
    except Exception as e:
        derr("summary.combined_graph.error", error=str(e))
        return jsonify({"error": "An internal server error occurred."}), 500


@summary_bp.route('/income_report_pivot', methods=['GET'])
def get_income_report_pivot():
    try:
        month_str = request.args.get("month")
        if not month_str:
            dwarn("summary.income_pivot.missing_month")
            return jsonify({"error": "Month parametresi zorunludur"}), 400

        try:
            year, month = map(int, month_str.split("-"))
            start_date = date(year, month, 1)
            end_date = start_date + relativedelta(months=1) - relativedelta(days=1)
        except ValueError:
            dwarn("summary.income_pivot.bad_month", value=month_str)
            return jsonify({"error": "Geçersiz tarih formatı. Lütfen YYYY-AA formatını kullanın."}), 400

        dinfo("summary.income_pivot.start", month=month_str)

        total_invoiced = db.session.query(func.sum(Income.total_amount))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0

        total_received_in_month = db.session.query(func.sum(IncomeReceipt.receipt_amount))\
            .filter(IncomeReceipt.receipt_date.between(start_date, end_date)).scalar() or 0

        remaining_from_month_invoices = db.session.query(func.sum(Income.total_amount - (Income.received_amount or 0)))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0

        customer_count = db.session.query(func.count(func.distinct(Income.customer_id)))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0

        kpis = {
            "total_invoiced": _flo(total_invoiced),
            "total_received": _flo(total_received_in_month),
            "remaining": _flo(remaining_from_month_invoices),
            "customer_count": int(customer_count),
        }

        # Pivot (müşteri x gün)
        rows = (db.session.query(
                    Customer.name.label('customer_name'),
                    extract('day', IncomeReceipt.receipt_date).label('day'),
                    func.sum(IncomeReceipt.receipt_amount).label('daily_total')
                )
                .join(Income, Income.id == IncomeReceipt.income_id)
                .join(Customer, Customer.id == Income.customer_id)
                .filter(IncomeReceipt.receipt_date.between(start_date, end_date))
                .group_by(Customer.name, extract('day', IncomeReceipt.receipt_date))
                .all())

        pivot = {}
        for r in rows:
            cust = r.customer_name
            pivot.setdefault(cust, {"customer_name": cust})
            day_key = str(int(r.day))
            pivot[cust][day_key] = _flo(r.daily_total)

        for cust, obj in pivot.items():
            obj["total"] = sum(v for k, v in obj.items() if k.isdigit())

        out = {
            "month": month_str,
            "timeframe": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "kpis": kpis,
            "pivot_data": list(pivot.values())
        }
        dinfo("summary.income_pivot.done",
              rows=len(rows), customers=len(out["pivot_data"]))
        return jsonify(out), 200

    except Exception as e:
        derr("summary.income_pivot.error", error=str(e))
        # terminallere stack basılmasına gerek yok; derr zaten exception logluyor
        return jsonify({
            "error": "Rapor oluşturulurken sunucuda bir hata oluştu.",
            "error_details": str(e)
        }), 500

