import logging
from flask import Blueprint, request, jsonify
from . import services
from .schemas import BankSchema, BankAccountSchema

# Ensure logging is configured
logging.basicConfig(level=logging.INFO)

banks_bp = Blueprint('banks_api', __name__, url_prefix='/api')

@banks_bp.route('/banks', methods=['GET', 'POST'])
def handle_banks():
    if request.method == 'GET':
        banks = services.get_all_banks()
        return jsonify(BankSchema(many=True).dump(banks)), 200
    
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request must be JSON"}), 400
        bank = services.create_bank(data)
        return jsonify(BankSchema().dump(bank)), 201

@banks_bp.route('/bank-accounts', methods=['GET', 'POST'])
def handle_bank_accounts():
    if request.method == 'GET':
        accounts = services.get_all_bank_accounts()
        return jsonify(BankAccountSchema(many=True).dump(accounts)), 200
    
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request must be JSON"}), 400
        account = services.create_bank_account(data)
        return jsonify(BankAccountSchema().dump(account)), 201


@banks_bp.route('/banks/<int:bank_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_bank(bank_id):
    logging.info(f"--- Entered handle_bank for ID: {bank_id}, Method: {request.method} ---")
    
    if request.method == 'GET':
        bank = services.get_bank_by_id(bank_id)
        if bank:
            return jsonify(BankSchema().dump(bank)), 200
        return jsonify({'error': 'Bank not found'}), 404
    
    if request.method == 'PUT':
        data = request.get_json()
        if not data:
            logging.error(f"PUT request for bank {bank_id} had no JSON body.")
            return jsonify({"error": "Request must be JSON"}), 400
        
        logging.info(f"Data for PUT /banks/{bank_id}: {data}")
        bank = services.update_bank(bank_id, data)
        if bank:
            return jsonify(BankSchema().dump(bank)), 200
        return jsonify({'error': 'Bank not found'}), 404
    
    if request.method == 'DELETE':
        logging.info(f"Attempting to delete bank {bank_id}")
        if services.delete_bank(bank_id):
            logging.info(f"Successfully deleted bank {bank_id}")
            return '', 204
        logging.error(f"Failed to delete bank {bank_id}, not found.")
        return jsonify({'error': 'Bank not found'}), 404

@banks_bp.route('/bank-accounts/<int:account_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_bank_account(account_id):
    logging.info(f"--- Entered handle_bank_account for ID: {account_id}, Method: {request.method} ---")
    
    if request.method == 'GET':
        account = services.get_bank_account_by_id(account_id)
        if account:
            return jsonify(BankAccountSchema().dump(account)), 200
        return jsonify({'error': 'Bank account not found'}), 404
    
    if request.method == 'PUT':
        data = request.get_json()
        if not data:
            logging.error(f"PUT request for bank account {account_id} had no JSON body.")
            return jsonify({"error": "Request must be JSON"}), 400
            
        logging.info(f"Data for PUT /bank-accounts/{account_id}: {data}")
        account = services.update_bank_account(account_id, data)
        if account:
            return jsonify(BankAccountSchema().dump(account)), 200
        return jsonify({'error': 'Bank account not found'}), 404
    
    if request.method == 'DELETE':
        logging.info(f"Attempting to delete bank account {account_id}")
        if services.delete_bank_account(account_id):
            logging.info(f"Successfully deleted bank account {account_id}")
            return '', 204
        logging.error(f"Failed to delete bank account {account_id}, not found.")
        return jsonify({'error': 'Bank account not found'}), 404
