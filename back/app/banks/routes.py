from flask import Blueprint, request, jsonify
from . import services
from .schemas import BankSchema, BankAccountSchema

banks_bp = Blueprint('banks_api', __name__, url_prefix='/api')

@banks_bp.route('/banks', methods=['GET', 'POST'])
def handle_banks():
    if request.method == 'GET':
        banks = services.get_all_banks()
        return jsonify(BankSchema(many=True).dump(banks)), 200
    
    if request.method == 'POST':
        bank = services.create_bank(request.json)
        return jsonify(BankSchema().dump(bank)), 201

@banks_bp.route('/bank-accounts', methods=['GET', 'POST'])
def handle_bank_accounts():
    if request.method == 'GET':
        accounts = services.get_all_bank_accounts()
        return jsonify(BankAccountSchema(many=True).dump(accounts)), 200
    
    if request.method == 'POST':
        account = services.create_bank_account(request.json)
        return jsonify(BankAccountSchema().dump(account)), 201
