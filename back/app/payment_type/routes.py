from flask import Blueprint, request, jsonify
from app.payment_type.services import get_all, create, update, delete
from app.payment_type.schemas import PaymentTypeSchema

payment_type_bp = Blueprint('payment_type_api', __name__, url_prefix='/api/payment-types')

@payment_type_bp.route("/", methods=["GET"])
def list_payment_types():
    payment_types = get_all()
    return jsonify(payment_types), 200

@payment_type_bp.route("/", methods=["POST"])
def add_payment_type():
    data = request.get_json()
    schema = PaymentTypeSchema()
    validated_data = schema.load(data)
    payment_type = create(validated_data)
    return jsonify(payment_type), 201

@payment_type_bp.route("/<int:payment_type_id>", methods=["PUT"])
def edit_payment_type(payment_type_id):
    data = request.get_json()
    schema = PaymentTypeSchema()
    validated_data = schema.load(data, partial=True)
    payment_type = update(payment_type_id, validated_data)
    if not payment_type:
        return {"message": "PaymentType not found"}, 404
    return schema.dump(payment_type), 200

@payment_type_bp.route("/<int:payment_type_id>", methods=["DELETE"])
def remove_payment_type(payment_type_id):
    payment_type = delete(payment_type_id)
    if not payment_type:
        return {"message": "PaymentType not found"}, 404
    return {"message": "PaymentType deleted"}, 200
