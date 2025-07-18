from flask import Blueprint, request, jsonify
import logging
from . import services
from .schemas import BankSchema, BankAccountSchema, CreditCardSchema, CreditCardTransactionSchema, CardBrandSchema

credit_cards_bp = Blueprint('credit_cards_api', __name__, url_prefix='/api')

@credit_cards_bp.route('/card-brands', methods=['GET', 'POST'])
def handle_card_brands():
    if request.method == 'GET':
        brands = services.get_all_card_brands()
        return jsonify(CardBrandSchema(many=True).dump(brands)), 200
    
    if request.method == 'POST':
        brand = services.create_card_brand(request.json)
        return jsonify(CardBrandSchema().dump(brand)), 201

@credit_cards_bp.route('/banks', methods=['GET', 'POST'])
def handle_banks():
    if request.method == 'GET':
        banks = services.get_all_banks()
        return jsonify(BankSchema(many=True).dump(banks)), 200
    
    if request.method == 'POST':
        bank = services.create_bank(request.json)
        return jsonify(BankSchema().dump(bank)), 201

@credit_cards_bp.route('/bank-accounts', methods=['GET', 'POST'])
def handle_bank_accounts():
    if request.method == 'GET':
        accounts = services.get_all_bank_accounts()
        return jsonify(BankAccountSchema(many=True).dump(accounts)), 200
    
    if request.method == 'POST':
        account = services.create_bank_account(request.json)
        return jsonify(BankAccountSchema().dump(account)), 201

@credit_cards_bp.route('/credit-cards', methods=['GET', 'POST'])
def handle_credit_cards():
    if request.method == 'GET':
        try:
            cards = services.get_all_credit_cards()
            return jsonify(CreditCardSchema(many=True).dump(cards)), 200
        except Exception as e:
            logging.exception("Error fetching credit cards")
            return jsonify({"message": "An error occurred while fetching credit cards."}), 500
    
    if request.method == 'POST':
        try:
            card = services.create_credit_card(request.json)
            return jsonify(CreditCardSchema().dump(card)), 201
        except Exception as e:
            logging.exception("Error creating credit card")
            return jsonify({"message": "An error occurred while creating the credit card."}), 500

@credit_cards_bp.route('/credit-cards/<int:card_id>', methods=['GET', 'PUT'])
def handle_credit_card(card_id):
    if request.method == 'GET':
        card = services.get_credit_card_by_id(card_id)
        if not card:
            return jsonify({'message': 'Credit card not found'}), 404
        return jsonify(CreditCardSchema().dump(card)), 200
    
    if request.method == 'PUT':
        try:
            card = services.update_credit_card(card_id, request.json)
            if not card:
                return jsonify({'message': 'Credit card not found'}), 404
            return jsonify(CreditCardSchema().dump(card)), 200
        except Exception as e:
            logging.exception(f"Error updating credit card with id {card_id}")
            return jsonify({"message": "An error occurred while updating the credit card."}), 500

@credit_cards_bp.route('/credit-cards/<int:card_id>/transactions', methods=['GET', 'POST'])
def handle_transactions(card_id):
    if request.method == 'GET':
        transactions = services.get_transactions_for_card(card_id)
        return jsonify(CreditCardTransactionSchema(many=True).dump(transactions)), 200

    if request.method == 'POST':
        transaction = services.add_transaction_to_card(card_id, request.json)
        if not transaction:
            return jsonify({'message': 'Credit card not found'}), 404
        return jsonify(CreditCardTransactionSchema().dump(transaction)), 201
