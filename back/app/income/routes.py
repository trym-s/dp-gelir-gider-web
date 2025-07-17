from flask import Blueprint, request, jsonify
from app.income.services import (
    get_all, create, update, delete, get_by_id,
    create_income_group_with_incomes, get_income_pivot, add_receipt, get_all_groups
)
from app.income.schemas import IncomeSchema, IncomeGroupSchema, IncomeReceiptSchema
from app import db
from app.models import Income

income_bp = Blueprint('income_api', __name__, url_prefix='/api/incomes')
income_group_bp = Blueprint('income_group_api', __name__, url_prefix='/api/income-groups')

@income_group_bp.route('/', methods=['GET'], strict_slashes=False)
def list_income_groups():
    groups = get_all_groups()
    schema = IncomeGroupSchema(many=True)
    return jsonify(schema.dump(groups)), 200

@income_bp.route("/<int:income_id>/receipts", methods=["POST"])
def add_receipt_to_income(income_id):
    data = request.get_json()
    data['income_id'] = income_id
    
    schema = IncomeReceiptSchema(session=db.session)
    try:
        receipt = schema.load(data)
        new_receipt = add_receipt(receipt)
        return jsonify(schema.dump(new_receipt)), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@income_bp.route("/", methods=["GET"], strict_slashes=False)
def list_incomes():
    try:
        filters = {k: v for k, v in request.args.items() if v is not None}
        page = int(filters.pop('page', 1))
        per_page = int(filters.pop('per_page', 20))
        sort_by = filters.pop('sort_by', 'date')
        sort_order = filters.pop('sort_order', 'desc')
        
        paginated_incomes = get_all(
            filters=filters, 
            sort_by=sort_by, 
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )
        
        schema = IncomeSchema(many=True)
        return jsonify({
            "data": schema.dump(paginated_incomes.items),
            "pagination": {
                "total_pages": paginated_incomes.pages,
                "total_items": paginated_incomes.total,
                "current_page": paginated_incomes.page
            }
        }), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

@income_bp.route("/<int:income_id>", methods=["GET"])
def get_single_income(income_id):
    income = get_by_id(income_id)
    if not income:
        return jsonify({"message": "Income not found"}), 404
    schema = IncomeSchema()
    return jsonify(schema.dump(income)), 200

@income_bp.route("/", methods=["POST"])
def add_income():
    data = request.get_json()
    schema = IncomeSchema(session=db.session)
    try:
        income = schema.load(data)
        new_income = create(income)
        return schema.dump(new_income), 201
    except Exception as e:
        return {"message": str(e)}, 400

@income_bp.route("/income-groups", methods=["POST"])
def add_income_group_with_incomes():
    data = request.get_json()
    group_name = data.get("group_name")
    repeat_count = data.get("repeat_count")
    income_template_data = data.get("income_template_data")

    if not group_name or not repeat_count or not income_template_data:
        return {"message": "group_name, repeat_count, and income_template_data are required."}, 400

    try:
        result = create_income_group_with_incomes(group_name, income_template_data, repeat_count)
        group_schema = IncomeGroupSchema()
        income_schema = IncomeSchema(many=True)
        response = {
            "income_group": group_schema.dump(result["income_group"]),
            "incomes": income_schema.dump(result["incomes"])
        }
        return jsonify(response), 201
    except Exception as e:
        db.session.rollback()
        return {"message": str(e)}, 500

@income_bp.route("/<int:income_id>", methods=["PUT"])
def edit_income(income_id):
    data = request.get_json()
    updated_income = update(income_id, data)
    if not updated_income:
        return jsonify({"message": "Income not found"}), 404
    schema = IncomeSchema()
    return jsonify(schema.dump(updated_income)), 200

@income_bp.route("/<int:income_id>", methods=["DELETE"])
def remove_income(income_id):
    income = delete(income_id)
    if not income:
        return {"message": "Income not found"}, 404
    return {"message": "Income deleted"}, 200

@income_bp.route('/pivot', methods=['GET'])
def pivot_income():
    month_str = request.args.get("month")
    if not month_str:
        return jsonify({"error": "Month parameter is required"}), 400
    
    results = get_income_pivot(month_str)
    
    data = [
        {
            "id": row.id,
            "date": row.date.strftime("%Y-%m-%d"),
            "day": row.date.day,
            "description": row.description,
            "amount": float(row.total_amount),
            "budget_item_id": row.budget_item_id,
            "budget_item_name": row.budget_item_name,
            "region_id": row.region_id,
            "region_name": row.region_name,
        }
        for row in results
    ]
    return jsonify(data), 200