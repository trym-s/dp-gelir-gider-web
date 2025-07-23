from flask import Blueprint, request, jsonify
from app import db
from .services import (
    get_all_loans,
    add_or_update_loan,
    delete_loan,
    get_all_loan_types,
    add_loan_type
)
from .schemas import LoanSchema, LoanTypeSchema

loan_bp = Blueprint('loan_api', __name__, url_prefix='/api/loan')


@loan_bp.route('/list', methods=['GET'])
def list_loans():
    loans = get_all_loans()
    schema = LoanSchema(many=True)
    return schema.jsonify(loans)


@loan_bp.route('/add', methods=['POST'])
def add_loan():
    try:
        data = request.get_json()
        loan = add_or_update_loan(data)
        return LoanSchema().dump(loan), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400



@loan_bp.route("/delete/<int:loan_id>", methods=["DELETE"])
def delete(loan_id):
    try:
        delete_loan(loan_id)
        return jsonify({"message": "Loan deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@loan_bp.route("/types", methods=["GET"])
def get_loan_types():
    try:
        types = get_all_loan_types()
        return jsonify(LoanTypeSchema(many=True).dump(types)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@loan_bp.route("/types/add", methods=["POST"])
def create_loan_type():
    try:
        data = request.get_json()
        name = data.get("name")
        if not name:
            return jsonify({"error": "Name is required"}), 400
        loan_type = add_loan_type(name)
        return jsonify(LoanTypeSchema().dump(loan_type)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500