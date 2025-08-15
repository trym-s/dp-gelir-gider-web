# app/expense/routes.py
from flask import Blueprint, request, jsonify
from app.errors import AppError
from app.logging_utils import route_logger, dinfo

from app.expense.schemas import ExpenseSchema, ExpenseGroupSchema
from app.expense.services import ExpenseService  # <— sınıf tabanlı servis

from app import db
from app.expense.models import Expense
from app.region.models import Region
from app.budget_item.models import BudgetItem
from app.account_name.models import AccountName
from datetime import datetime

expense_bp = Blueprint('expense_api', __name__, url_prefix='/api/expenses')
expense_group_bp = Blueprint('expense_group_api', __name__, url_prefix='/api/expense-groups')

expense_service = ExpenseService()

# --------------------------- Expense Groups ---------------------------

@expense_group_bp.route('/', methods=['GET'], strict_slashes=False)
@route_logger
def list_expense_groups():
    groups = expense_service.get_all_groups()
    return jsonify(ExpenseGroupSchema(many=True).dump(groups)), 200

@expense_bp.route("/expense-groups", methods=["POST"])
@route_logger
def add_expense_group_with_expenses():
    data = request.get_json(silent=True) or {}
    group_name = data.get("group_name")
    repeat_count = data.get("repeat_count")
    expense_template_data = data.get("expense_template_data")

    if not group_name or not repeat_count or not expense_template_data:
        raise AppError("group_name, repeat_count, expense_template_data are required.", 400)

    result = expense_service.create_expense_group_with_expenses(group_name, expense_template_data, repeat_count)
    return jsonify({
        "expense_group": ExpenseGroupSchema().dump(result["expense_group"]),
        "expenses": ExpenseSchema(many=True).dump(result["expenses"])
    }), 201

# ------------------------------ Expenses ------------------------------

@expense_bp.route("/", methods=["GET"], strict_slashes=False)
@route_logger
def list_expenses():
    filters = {k: v for k, v in request.args.items() if v is not None}
    try:
        page = int(filters.pop('page', 1))
        per_page = int(filters.pop('per_page', 20))
    except ValueError:
        raise AppError("page and per_page must be integers", 400)

    sort_by = filters.pop('sort_by', 'date')
    sort_order = filters.pop('sort_order', 'desc')

    paginated = expense_service.list(
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page
    )

    return jsonify({
        "data": ExpenseSchema(many=True).dump(paginated.items),
        "pagination": {
            "total_pages": paginated.pages,
            "total_items": paginated.total,
            "current_page": paginated.page
        }
    }), 200

@expense_bp.route("/<int:expense_id>", methods=["GET"])
@route_logger
def get_single_expense(expense_id):
    exp = expense_service.get_by_id(expense_id)
    return jsonify(ExpenseSchema().dump(exp)), 200

@expense_bp.route('/', methods=['POST'], strict_slashes=False)
@route_logger
def add_expense():
    data = request.get_json(silent=True)
    if not data:
        raise AppError("No input data provided", 400)
    exp = expense_service.create(data)
    return jsonify(ExpenseSchema().dump(exp)), 201

@expense_bp.route("/<int:expense_id>", methods=["PUT"])
@route_logger
def edit_expense(expense_id):
    data = request.get_json(silent=True)
    if data is None:
        raise AppError("No input data provided", 400)
    exp = expense_service.update(expense_id, data)
    return jsonify(ExpenseSchema().dump(exp)), 200

@expense_bp.route("/<int:expense_id>", methods=["DELETE"])
@route_logger
def remove_expense(expense_id):
    result = expense_service.delete(expense_id)
    return result, 200

# ------------------------------- Pivot --------------------------------

@expense_bp.route('/pivot', methods=['GET'])
@route_logger
def get_expense_pivot():
    month_str = request.args.get("month")
    if not month_str:
        raise AppError("month query param is required (YYYY-MM)", 400)

    try:
        year, month = map(int, month_str.split("-"))
        if not (1 <= month <= 12):
            raise ValueError
    except Exception:
        raise AppError("month must be in format YYYY-MM", 400)

    start_date = datetime(year, month, 1)
    end_date = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    query = (
        db.session.query(
            Expense.id,
            Expense.date,
            Expense.amount,
            Expense.description,
            Region.id.label("region_id"),
            Region.name.label("region_name"),
            BudgetItem.id.label("budget_item_id"),
            BudgetItem.name.label("budget_item_name"),
            AccountName.name.label("account_name")
        )
        .join(Region, Region.id == Expense.region_id)
        .join(BudgetItem, BudgetItem.id == Expense.budget_item_id)
        .join(AccountName, AccountName.id == Expense.account_name_id)
        .filter(Expense.date >= start_date, Expense.date < end_date)
    )

    rows = query.all()
    data = [{
        "id": r.id,
        "date": r.date.strftime("%Y-%m-%d"),
        "day": r.date.day,
        "description": r.description,
        "amount": float(r.amount),
        "budget_item_id": r.budget_item_id,
        "budget_item_name": r.budget_item_name,
        "region_id": r.region_id,
        "region_name": r.region_name,
        "account_name": r.account_name,
    } for r in rows]

    dinfo("pivot.built", month=month_str, rows=len(data))
    return jsonify(data), 200

