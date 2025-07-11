from flask import Blueprint, request, jsonify
from app.expense.services import get_all, create, update, delete,     create_expense_group_with_expenses, get_by_id
from app.expense.schemas import ExpenseSchema, ExpenseGroupSchema
from app import db
from app.payments.services import PaymentService
from app.payments.schemas import PaymentSchema


expense_bp = Blueprint('expense_api', __name__, url_prefix='/api/expenses')
payment_service = PaymentService()

@expense_bp.route("/", methods=["GET"], strict_slashes=False)
def list_expenses():
    try:
        filters = {k: v for k, v in request.args.items() if v is not None}
        page = int(filters.pop('page', 1))
        per_page = int(filters.pop('per_page', 20))
        sort_by = filters.pop('sort_by', 'date')
        sort_order = filters.pop('sort_order', 'desc')
        
        paginated_expenses = get_all(
            filters=filters, 
            sort_by=sort_by, 
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )
        
        schema = ExpenseSchema(many=True)
        return jsonify({
            "data": schema.dump(paginated_expenses.items),
            "pagination": {
                "total_pages": paginated_expenses.pages,
                "total_items": paginated_expenses.total,
                "current_page": paginated_expenses.page
            }
        }), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

@expense_bp.route("/<int:expense_id>", methods=["GET"])
def get_single_expense(expense_id):
    expense = get_by_id(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404
    schema = ExpenseSchema()
    return jsonify(schema.dump(expense)), 200

@expense_bp.route("/", methods=["POST"])
def add_expense():
    data = request.get_json()
    schema = ExpenseSchema(session=db.session)
    try:
        expense = schema.load(data)
        new_expense = create(expense)
        return schema.dump(new_expense), 201
    except Exception as e:
        return {"message": str(e)}, 400

@expense_bp.route("/expense-groups", methods=["POST"])
def add_expense_group_with_expenses():
    data = request.get_json()

    group_name = data.get("group_name")
    repeat_count = data.get("repeat_count")
    expense_template_data = data.get("expense_template_data")

    if not group_name or not repeat_count or not expense_template_data:
        return {"message": "group_name, repeat_count, and expense_template_data are required."},400

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
    try:
        updated_expense = update(expense_id, data)
        if not updated_expense:
            return jsonify({"message": "Expense not found"}), 404
        
        schema = ExpenseSchema()
        return jsonify(schema.dump(updated_expense)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

@expense_bp.route("/<int:expense_id>", methods=["DELETE"])
def remove_expense(expense_id):
    expense = delete(expense_id)
    if not expense:
        return {"message": "Expense not found"}, 404
    return {"message": "Expense deleted"}, 200

@expense_bp.route("/<int:expense_id>/payments", methods=["POST"])
def add_payment_to_expense(expense_id):
    data = request.get_json()
    if not data or 'payment_amount' not in data or 'payment_date' not in data:
        return jsonify({"error": "Missing required payment information"}), 400

    try:
        payment = payment_service.create(expense_id, data)
        schema = PaymentSchema()
        return jsonify(schema.dump(payment)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400