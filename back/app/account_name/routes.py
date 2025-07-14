from flask import Blueprint, request, jsonify
from app.account_name.services import get_all, create, update, delete
from app.account_name.schemas import AccountNameSchema

account_name_bp = Blueprint('account_name_api', __name__, url_prefix='/api/account_names')

@account_name_bp.route("/", methods=["GET"], strict_slashes=False)
def list_account_names():
    account_names = get_all()
    schema = AccountNameSchema(many=True)
    return jsonify(schema.dump(account_names)), 200

@account_name_bp.route("/", methods=["POST"])
def add_account_name():
    data = request.get_json()
    schema = AccountNameSchema()
    validated_data = schema.load(data)
    account_name = create(validated_data)
    return jsonify(account_name), 201

@account_name_bp.route("/<int:account_name_id>", methods=["PUT"])
def edit_account_name(account_name_id):
    data = request.get_json()
    schema = AccountNameSchema()
    validated_data = schema.load(data, partial=True)
    account_name = update(account_name_id, validated_data)
    if not account_name:
        return {"message": "AccountName not found"}, 404
    return jsonify(schema.dump(account_name)), 200

@account_name_bp.route("/<int:account_name_id>", methods=["DELETE"])
def remove_account_name(account_name_id):
    account_name = delete(account_name_id)
    if not account_name:
        return {"message": "AccountName not found"}, 404
    return {"message": "AccountName deleted"}, 200