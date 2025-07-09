from flask import Blueprint, request, jsonify
from app.expense.services import get_all_expenses, create_expense, update_expense, delete_expense, \
    create_expense_group_with_expenses
from app.expense.schemas import ExpenseSchema, ExpenseGroupSchema
from app import db

expense_bp = Blueprint('expense_api', __name__)

@expense_bp.route("/", methods=["GET"])
def list_expenses():
    try:
        filters = {k: v for k, v in request.args.items() if v is not None}
        sort_by = filters.pop('sort_by', None)
        sort_order = filters.pop('sort_order', 'asc')
        expenses = get_all_expenses(filters, sort_by, sort_order)
        schema = ExpenseSchema(many=True)
        return jsonify(schema.dump(expenses)), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

@expense_bp.route("/", methods=["POST"])
def add_expense():
    data = request.get_json()
    schema = ExpenseSchema()
    try:
        validated_data = schema.load(data)
        expense = create_expense(validated_data)
        return schema.dump(expense), 201
    except ValueError as e:
        return {"message": str(e)}, 400

@expense_bp.route("/expense-groups", methods=["POST"])
def add_expense_group_with_expenses():
    data = request.get_json()

    group_name = data.get("group_name")
    repeat_count = data.get("repeat_count")
    expense_template_data = data.get("expense_template_data")

    if not group_name or not repeat_count or not expense_template_data:
        return {"message": "group_name, repeat_count, and expense_template_data are required."}, 400

    try:
        result = create_expense_group_with_expenses(group_name, expense_template_data, repeat_count)
        group_schema = ExpenseGroupSchema()
        expense_schema = ExpenseSchema(many=True)

        response = {
            "expense_group": group_schema.dump(result["expense_group"]),
            "expenses": expense_schema.dump(result["expenses"])
        }

        return jsonify(response), 201

    except Exception as e:
        db.session.rollback()
        return {"message": str(e)}, 500

@expense_bp.route("/<int:expense_id>", methods=["PUT"])
def edit_expense(expense_id):
    data = request.get_json()
    schema = ExpenseSchema()
    try:
        validated_data = schema.load(data, partial=True)
        expense = update_expense(expense_id, validated_data)
        if not expense:
            return {"message": "Expense not found"}, 404
        return schema.dump(expense), 200
    except ValueError as e:
        return {"message": str(e)}, 400

@expense_bp.route("/<int:expense_id>", methods=["DELETE"])
def remove_expense(expense_id):
    expense = delete_expense(expense_id)
    if not expense:
        return {"message": "Expense not found"}, 404
    return {"message": "Expense deleted"}, 200
