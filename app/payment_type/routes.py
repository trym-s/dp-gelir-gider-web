from flask import Blueprint, request, jsonify
from app.payment_type.services import get_all_payment_types, create_payment_type, update_payment_type, delete_payment_type
from app.payment_type.schemas import PaymentTypeSchema

payment_type_bp = Blueprint('payment_type_api', __name__)

@payment_type_bp.route("/", methods=["GET"])
def list_payment_types():
    payment_types = get_all_payment_types()
    schema = PaymentTypeSchema(many=True)
    return jsonify(schema.dump(payment_types)), 200

@payment_type_bp.route("/", methods=["POST"])
def add_payment_type():
    data = request.get_json()
    schema = PaymentTypeSchema()
    validated_data = schema.load(data)
    payment_type = create_payment_type(validated_data)
    return schema.dump(payment_type), 201

@payment_type_bp.route("/<int:payment_type_id>", methods=["PUT"])
def edit_payment_type(payment_type_id):
    data = request.get_json()
    schema = PaymentTypeSchema()
    validated_data = schema.load(data, partial=True)
    payment_type = update_payment_type(payment_type_id, validated_data)
    if not payment_type:
        return {"message": "PaymentType not found"}, 404
    return schema.dump(payment_type), 200

@payment_type_bp.route("/<int:payment_type_id>", methods=["DELETE"])
def remove_payment_type(payment_type_id):
    payment_type = delete_payment_type(payment_type_id)
    if not payment_type:
        return {"message": "PaymentType not found"}, 404
    return {"message": "PaymentType deleted"}, 200