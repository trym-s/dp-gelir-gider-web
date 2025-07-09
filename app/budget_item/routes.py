from flask import Blueprint, request, jsonify
from app.budget_item.services import get_all_budget_items, create_budget_item, update_budget_item, delete_budget_item
from app.budget_item.schemas import BudgetItemSchema

budget_item_bp = Blueprint('budget_item_api', __name__)

@budget_item_bp.route("/", methods=["GET"])
def list_budget_items():
    budget_items = get_all_budget_items()
    schema = BudgetItemSchema(many=True)
    return jsonify(schema.dump(budget_items)), 200

@budget_item_bp.route("/", methods=["POST"])
def add_budget_item():
    data = request.get_json()
    schema = BudgetItemSchema()
    validated_data = schema.load(data)
    budget_item = create_budget_item(validated_data)
    return schema.dump(budget_item), 201

@budget_item_bp.route("/<int:budget_item_id>", methods=["PUT"])
def edit_budget_item(budget_item_id):
    data = request.get_json()
    schema = BudgetItemSchema()
    validated_data = schema.load(data, partial=True)
    budget_item = update_budget_item(budget_item_id, validated_data)
    if not budget_item:
        return {"message": "BudgetItem not found"}, 404
    return schema.dump(budget_item), 200

@budget_item_bp.route("/<int:budget_item_id>", methods=["DELETE"])
def remove_budget_item(budget_item_id):
    budget_item = delete_budget_item(budget_item_id)
    if not budget_item:
        return {"message": "BudgetItem not found"}, 404
    return {"message": "BudgetItem deleted"}, 200
