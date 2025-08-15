
# app/summary/services.py

from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from app import db
from app.expense.models import Expense
from app.income.models import Income, IncomeReceipt
from app.budget_item.models import BudgetItem
from app.region.models import Region
from app.account_name.models import AccountName
from app.customer.models import Customer
import logging

# ---- Structured logging helpers (projede varsa onları kullan) ----
try:
    from app.logging_utils import dinfo, dwarn, derr
except Exception:  # fallback
    def dinfo(evt, **kw): logging.getLogger(__name__).info("%s | %s", evt, kw)
    def dwarn(evt, **kw): logging.getLogger(__name__).warning("%s | %s", evt, kw)
    def derr(evt, **kw):  logging.getLogger(__name__).exception("%s | %s", evt, kw)

# ---- tiny helpers -------------------------------------------------
def _flo(x):
    try:
        return float(x) if x is not None else 0.0
    except Exception:
        return 0.0


# ------------------------------------------------------------------------------
# Date helpers
# ------------------------------------------------------------------------------
def get_date_range(start_date_str, end_date_str):
    """Parses date strings or defaults to the current month (inclusive)."""
    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            dinfo("summary.services.get_date_range.ok", start=start_date.isoformat(), end=end_date.isoformat())
            return start_date, end_date
        except ValueError:
            dwarn("summary.services.get_date_range.bad_format",
                  start=start_date_str, end=end_date_str)
            raise ValueError("Invalid date format. Please use YYYY-MM-DD.")
    else:
        today = date.today()
        start_date = today.replace(day=1)
        end_date = start_date + relativedelta(months=1) - relativedelta(days=1)
        dinfo("summary.services.get_date_range.defaulted",
              start=start_date.isoformat(), end=end_date.isoformat())
        return start_date, end_date


# ------------------------------------------------------------------------------
# Main financial summary
# ------------------------------------------------------------------------------
def calculate_financial_summary(start_date, end_date):
    """Calculates the main financial summary for a given date range."""
    dinfo("summary.services.financial_summary.start",
          start=start_date.isoformat(), end=end_date.isoformat())
    try:
        # --- Expense (tahakkuk) ---
        total_expenses = db.session.query(func.sum(Expense.amount))\
            .filter(Expense.date.between(start_date, end_date)).scalar() or 0
        total_expense_remaining = db.session.query(func.sum(Expense.remaining_amount))\
            .filter(Expense.date.between(start_date, end_date)).scalar() or 0
        total_payments = (total_expenses or 0) - (total_expense_remaining or 0)

        # --- Income (tahakkuk) ---
        total_income = db.session.query(func.sum(Income.total_amount))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0

        # Daha taşınabilir ve güvenli: kalan = toplam - tahsil edilen
        total_received = db.session.query(func.sum(Income.received_amount))\
            .filter(Income.issue_date.between(start_date, end_date)).scalar() or 0
        total_income_remaining = (total_income or 0) - (total_received or 0)

        out = {
            "total_expenses": _flo(total_expenses),
            "total_payments": _flo(total_payments),
            "total_expense_remaining": _flo(total_expense_remaining),
            "total_income": _flo(total_income),
            "total_received": _flo(total_received),
            "total_income_remaining": _flo(total_income_remaining)
        }
        dinfo("summary.services.financial_summary.done", **out)
        return out
    except Exception as e:
        derr("summary.services.financial_summary.error", error=str(e))
        raise


# ------------------------------------------------------------------------------
# Detailed reports
# ------------------------------------------------------------------------------
def _serialize_expense(e: Expense) -> dict:
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
        "date": e.date.isoformat() if getattr(e, "date", None) else None,
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
        "issue_date": i.issue_date.isoformat() if getattr(i, "issue_date", None) else None,
        "due_date": i.due_date.isoformat() if getattr(i, "due_date", None) else None,
        "region_id": getattr(i, "region_id", None),
        "budget_item_id": getattr(i, "budget_item_id", None),
        "account_name_id": getattr(i, "account_name_id", None),
        "customer_id": getattr(i, "customer_id", None),
    }

def generate_expense_report_data(start_date, end_date):
    """Generates a detailed expense report."""
    dinfo("summary.services.expense_report.start",
          start=start_date.isoformat(), end=end_date.isoformat())
    try:
        expenses = Expense.query.filter(
            Expense.date.between(start_date, end_date)
        ).order_by(Expense.date.desc()).all()

        total_expenses = sum((e.amount or 0) for e in expenses)
        total_expense_remaining = sum((e.remaining_amount or 0) for e in expenses)
        total_payments = (total_expenses or 0) - (total_expense_remaining or 0)

        details = [_serialize_expense(e) for e in expenses]
        out = {
            "summary": {
                "total_expenses": _flo(total_expenses),
                "total_payments": _flo(total_payments),
                "total_expense_remaining": _flo(total_expense_remaining),
                "count": len(details),
            },
            "details": details
        }
        dinfo("summary.services.expense_report.done", count=len(details))
        return out
    except Exception as e:
        derr("summary.services.expense_report.error", error=str(e))
        raise


def generate_income_report_data(start_date, end_date):
    """Generates a detailed income report."""
    dinfo("summary.services.income_report.start",
          start=start_date.isoformat(), end=end_date.isoformat())
    try:
        incomes = Income.query.filter(
            Income.issue_date.between(start_date, end_date)
        ).order_by(Income.issue_date.desc()).all()

        total_income = sum((i.total_amount or 0) for i in incomes)
        total_received = sum((i.received_amount or 0) for i in incomes)
        total_income_remaining = (total_income or 0) - (total_received or 0)

        details = [_serialize_income(i) for i in incomes]
        out = {
            "summary": {
                "total_income": _flo(total_income),
                "total_received": _flo(total_received),
                "total_income_remaining": _flo(total_income_remaining),
                "count": len(details),
            },
            "details": details
        }
        dinfo("summary.services.income_report.done", count=len(details))
        return out
    except Exception as e:
        derr("summary.services.income_report.error", error=str(e))
        raise


# ------------------------------------------------------------------------------
# Graph data
# ------------------------------------------------------------------------------
def get_expense_graph_data(start_date, end_date):
    """Fetches data for the expense graph."""
    dinfo("summary.services.expense_graph.start",
          start=start_date.isoformat(), end=end_date.isoformat())
    try:
        rows = (db.session.query(
                    Expense.date,
                    func.sum((Expense.amount or 0) - (Expense.remaining_amount or 0)),
                    func.sum(Expense.remaining_amount or 0)
                )
                .filter(Expense.date.between(start_date, end_date))
                .group_by(Expense.date)
                .order_by(Expense.date)
                .all())
        data = [{"date": d.strftime('%Y-%m-%d'), "paid": _flo(paid), "remaining": _flo(rem)}
                for d, paid, rem in rows]
        dinfo("summary.services.expense_graph.done", points=len(data))
        return data
    except Exception as e:
        derr("summary.services.expense_graph.error", error=str(e))
        raise


def get_income_graph_data(start_date, end_date):
    """Fetches data for the income graph."""
    dinfo("summary.services.income_graph.start",
          start=start_date.isoformat(), end=end_date.isoformat())
    try:
        rows = (db.session.query(
                    Income.issue_date,
                    func.sum(Income.received_amount or 0),
                    func.sum((Income.total_amount or 0) - (Income.received_amount or 0))
                )
                .filter(Income.issue_date.between(start_date, end_date))
                .group_by(Income.issue_date)
                .order_by(Income.issue_date)
                .all())
        data = [{"date": d.strftime('%Y-%m-%d'), "received": _flo(rec), "remaining": _flo(rem)}
                for d, rec, rem in rows]
        dinfo("summary.services.income_graph.done", points=len(data))
        return data
    except Exception as e:
        derr("summary.services.income_graph.error", error=str(e))
        raise


# ------------------------------------------------------------------------------
# Distribution (group-by) data
# ------------------------------------------------------------------------------
def get_expense_distribution_data(start_date, end_date, group_by='budget_item'):
    """
    Distribution of expenses by a category.
      group_by: 'budget_item' | 'region' | 'account_name'
    Returns: [{"name": "...", "paid": ..., "remaining": ...}, ...]
    """
    dinfo("summary.services.expense_distribution.start",
          start=start_date.isoformat(), end=end_date.isoformat(), group_by=group_by)
    try:
        if group_by == 'budget_item':
            model, field = BudgetItem, Expense.budget_item_id
        elif group_by == 'region':
            model, field = Region, Expense.region_id
        elif group_by == 'account_name':
            model, field = AccountName, Expense.account_name_id
        else:
            dwarn("summary.services.expense_distribution.bad_group_by", group_by=group_by)
            raise ValueError("Invalid group_by. Use one of: budget_item, region, account_name.")

        rows = (db.session.query(
                    model.name,
                    func.sum((Expense.amount or 0) - (Expense.remaining_amount or 0)),
                    func.sum(Expense.remaining_amount or 0)
                )
                .join(model, field == model.id)
                .filter(Expense.date.between(start_date, end_date))
                .group_by(model.name)
                .all())

        data = [{"name": name, "paid": _flo(paid), "remaining": _flo(rem)}
                for name, paid, rem in rows]
        dinfo("summary.services.expense_distribution.done", buckets=len(data))
        return data
    except Exception as e:
        derr("summary.services.expense_distribution.error", error=str(e))
        raise


def get_income_distribution_data(start_date, end_date, group_by='budget_item'):
    """
    Distribution of incomes by a category.
      group_by: 'budget_item' | 'region' | 'account_name' | 'customer'
    Returns: [{"name": "...", "received": ..., "remaining": ...}, ...]
    """
    dinfo("summary.services.income_distribution.start",
          start=start_date.isoformat(), end=end_date.isoformat(), group_by=group_by)
    try:
        if group_by == 'budget_item':
            model, field = BudgetItem, Income.budget_item_id
        elif group_by == 'region':
            model, field = Region, Income.region_id
        elif group_by == 'account_name':
            model, field = AccountName, Income.account_name_id
        elif group_by == 'customer':
            model, field = Customer, Income.customer_id
        else:
            dwarn("summary.services.income_distribution.bad_group_by", group_by=group_by)
            raise ValueError("Invalid group_by. Use one of: budget_item, region, account_name, customer.")

        rows = (db.session.query(
                    model.name,
                    func.sum(Income.received_amount or 0),
                    func.sum((Income.total_amount or 0) - (Income.received_amount or 0))
                )
                .join(model, field == model.id)
                .filter(Income.issue_date.between(start_date, end_date))
                .group_by(model.name)
                .all())

        data = [{"name": name, "received": _flo(rec), "remaining": _flo(rem)}
                for name, rec, rem in rows]
        dinfo("summary.services.income_distribution.done", buckets=len(data))
        return data
    except Exception as e:
        derr("summary.services.income_distribution.error", error=str(e))
        raise

