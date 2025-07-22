import logging
from flask import Blueprint, request, jsonify
from .services import (
    get_all_loans,
    get_loan_by_id,
    create_loan,
    update_loan,
    delete_loan,
    get_all_loan_types,
    get_loan_type_by_id,
    create_loan_type,
    update_loan_type,
    delete_loan_type
)
from .schemas import (
    loan_schema, 
    loans_schema,
    loan_type_schema,
    loan_types_schema
)

loans_bp = Blueprint('loans_api', __name__, url_prefix='/api')

# Loan Routes
@loans_bp.route('/loans', methods=['GET'])
def get_loans():
    try:
        loans = get_all_loans()
        return jsonify(loans_schema.dump(loans))
    except Exception as e:
        logging.exception("Error getting loans")
        return jsonify({"error": str(e)}), 500

@loans_bp.route('/loans/<int:loan_id>', methods=['GET'])
def get_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if not loan:
        return jsonify({'message': 'Loan not found'}), 404
    return jsonify(loan_schema.dump(loan))

@loans_bp.route('/loans', methods=['POST'])
def add_loan():
    data = request.get_json()
    new_loan = create_loan(data)
    return jsonify(loan_schema.dump(new_loan)), 201

@loans_bp.route('/loans/<int:loan_id>', methods=['PUT'])
def edit_loan(loan_id):
    data = request.get_json()
    updated_loan = update_loan(loan_id, data)
    if not updated_loan:
        return jsonify({'message': 'Loan not found'}), 404
    return jsonify(loan_schema.dump(updated_loan))

@loans_bp.route('/loans/<int:loan_id>', methods=['DELETE'])
def remove_loan(loan_id):
    deleted_loan = delete_loan(loan_id)
    if not deleted_loan:
        return jsonify({'message': 'Loan not found'}), 404
    return jsonify({'message': 'Loan deleted successfully'})

# LoanType Routes
@loans_bp.route('/loan-types', methods=['GET'])
def get_loan_types():
    try:
        loan_types = get_all_loan_types()
        return jsonify(loan_types_schema.dump(loan_types))
    except Exception as e:
        logging.exception("Error getting loan types")
        return jsonify({"error": str(e)}), 500

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['GET'])
def get_loan_type(loan_type_id):
    loan_type = get_loan_type_by_id(loan_type_id)
    if not loan_type:
        return jsonify({'message': 'Loan type not found'}), 404
    return jsonify(loan_type_schema.dump(loan_type))

@loans_bp.route('/loan-types', methods=['POST'])
def add_loan_type():
    data = request.get_json()
    new_loan_type = create_loan_type(data)
    return jsonify(loan_type_schema.dump(new_loan_type)), 201

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['PUT'])
def edit_loan_type(loan_type_id):
    data = request.get_json()
    updated_loan_type = update_loan_type(loan_type_id, data)
    if not updated_loan_type:
        return jsonify({'message': 'Loan type not found'}), 404
    return jsonify(loan_type_schema.dump(updated_loan_type))

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['DELETE'])
def remove_loan_type(loan_type_id):
    deleted_loan_type = delete_loan_type(loan_type_id)
    if not deleted_loan_type:
        return jsonify({'message': 'Loan type not found'}), 404
    return jsonify({'message': 'Loan type deleted successfully'})
