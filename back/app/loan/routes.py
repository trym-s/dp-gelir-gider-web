from flask import Blueprint, request, jsonify
from app import db
from .services import get_all_loans, add_or_update_loan, delete_loan, get_all_loan_types, add_loan_type
from .schemas import LoanSchema, LoanTypeSchema
from app.models import Bank, BankLog, Loan, LoanType
loan_bp = Blueprint('loan', __name__, url_prefix='/loan')


@loan_bp.route('/list', methods=['GET'])
def list_loans():
    loans = get_all_loans()
    return LoanSchema(many=True).jsonify(loans)


@loan_bp.route('/add', methods=['POST'])
def add_loan():
    data = request.get_json()
    loan = add_or_update_loan(data)
    return LoanSchema().jsonify(loan)


@loan_bp.route('/delete/<int:loan_id>', methods=['DELETE'])
def delete(loan_id):
    delete_loan(loan_id)
    return jsonify({'message': 'Loan deleted'})


@loan_bp.route('/loan-types', methods=['GET'])
def list_loan_types():
    types = get_all_loan_types()
    return LoanTypeSchema(many=True).jsonify(types)


@loan_bp.route('/loan-types', methods=['POST'])
def create_loan_type():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    loan_type = add_loan_type(name)
    return LoanTypeSchema().jsonify(loan_type)
