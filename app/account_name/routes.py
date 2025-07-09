from flask import Blueprint, request, jsonify
from app.account_name.services import get_all_account_names, create_account_name, update_account_name, delete_account_name
from app.account_name.schemas import AccountNameSchema

account_name_bp = Blueprint('account_name_api', __name__)

@account_name_bp.route("/", methods=["GET"])
def list_account_names():
    account_names = get_all_account_names()
    schema = AccountNameSchema(many=True)
    return jsonify(schema.dump(account_names)), 200

@account_name_bp.route("/", methods=["POST"])
def add_account_name():
    data = request.get_json()
    schema = AccountNameSchema()
    validated_data = schema.load(data)
    account_name = create_account_name(validated_data)
    return schema.dump(account_name), 201

@account_name_bp.route("/<int:account_name_id>", methods=["PUT"])
def edit_account_name(account_name_id):
    data = request.get_json()
    schema = AccountNameSchema()
    validated_data = schema.load(data, partial=True)
    account_name = update_account_name(account_name_id, validated_data)
    if not account_name:
        return {"message": "AccountName not found"}, 404
    return schema.dump(account_name), 200

@account_name_bp.route("/<int:account_name_id>", methods=["DELETE"])
def remove_account_name(account_name_id):
    account_name = delete_account_name(account_name_id)
    if not account_name:
        return {"message": "AccountName not found"}, 404
    return {"message": "AccountName deleted"}, 200
