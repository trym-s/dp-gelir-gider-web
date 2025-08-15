
# app/credit_cards/routes.py
from flask import Blueprint, request, jsonify
from app.errors import AppError
from app.logging_utils import route_logger, dinfo, dwarn, derr

from . import services
from .schemas import CreditCardSchema, CreditCardTransactionSchema, CardBrandSchema

credit_cards_bp = Blueprint('credit_cards_api', __name__, url_prefix='/api')

# ----------------------------- Card Brands -----------------------------

@credit_cards_bp.route('/card-brands', methods=['GET', 'POST'])
@route_logger
def handle_card_brands():
    if request.method == 'GET':
        brands = services.get_all_card_brands()
        return jsonify(CardBrandSchema(many=True).dump(brands)), 200

    # POST
    data = request.get_json(silent=True)
    if not data:
        raise AppError("Request body is required.", 400, code="EMPTY_BODY")
    brand = services.create_card_brand(data)
    return jsonify(CardBrandSchema().dump(brand)), 201


@credit_cards_bp.route('/card-brands/<int:brand_id>', methods=['GET', 'PUT', 'DELETE'])
@route_logger
def handle_single_card_brand(brand_id):
    if request.method == 'GET':
        brand = services.get_card_brand_by_id(brand_id)
        if not brand:
            raise AppError("Card brand not found.", 404, code="BRAND_NOT_FOUND")
        return jsonify(CardBrandSchema().dump(brand)), 200

    if request.method == 'PUT':
        data = request.get_json(silent=True)
        if data is None:
            raise AppError("Request body is required.", 400, code="EMPTY_BODY")
        brand = services.update_card_brand(brand_id, data)
        if not brand:
            raise AppError("Card brand not found.", 404, code="BRAND_NOT_FOUND")
        return jsonify(CardBrandSchema().dump(brand)), 200

    # DELETE
    deleted = services.delete_card_brand(brand_id)
    if not deleted:
        raise AppError("Card brand not found.", 404, code="BRAND_NOT_FOUND")
    return jsonify({"message": "Card brand deleted successfully"}), 200


# ----------------------------- Credit Cards ----------------------------

@credit_cards_bp.route('/credit-cards', methods=['GET', 'POST'])
@route_logger
def handle_credit_cards():
    if request.method == 'GET':
        cards = services.get_all_credit_cards()
        return jsonify(CreditCardSchema(many=True).dump(cards)), 200

    # POST
    data = request.get_json(silent=True)
    if not data:
        raise AppError("Request body is required.", 400, code="EMPTY_BODY")
    card = services.create_credit_card(data)
    return jsonify(CreditCardSchema().dump(card)), 201


@credit_cards_bp.route('/credit-cards/<int:card_id>', methods=['GET', 'PUT', 'DELETE'])
@route_logger
def handle_credit_card(card_id):
    if request.method == 'GET':
        card = services.get_credit_card_by_id(card_id)
        if not card:
            raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")
        return jsonify(CreditCardSchema().dump(card)), 200

    if request.method == 'PUT':
        data = request.get_json(silent=True)
        if data is None:
            raise AppError("Request body is required.", 400, code="EMPTY_BODY")
        card = services.update_credit_card(card_id, data)
        if not card:
            raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")
        return jsonify(CreditCardSchema().dump(card)), 200

    # DELETE
    deleted = services.delete_credit_card(card_id)
    if not deleted:
        raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")
    return jsonify({"message": "Credit card deleted successfully"}), 200


# ----------------------------- Transactions ----------------------------

@credit_cards_bp.route('/credit-cards/<int:card_id>/transactions', methods=['GET', 'POST', 'PUT', 'DELETE'])
@route_logger
def handle_transactions(card_id):
    if request.method == 'GET':
        txs = services.get_transactions_for_card(card_id)
        # yoksa boş liste dönebilir; 404 değil
        return jsonify(CreditCardTransactionSchema(many=True).dump(txs)), 200

    if request.method == 'POST':
        data = request.get_json(silent=True)
        if not data:
            raise AppError("Request body is required.", 400, code="EMPTY_BODY")
        tx = services.add_transaction_to_card(card_id, data)
        if not tx:
            raise AppError("Credit card not found.", 404, code="CARD_NOT_FOUND")
        return jsonify(CreditCardTransactionSchema().dump(tx)), 201

    if request.method == 'PUT':
        data = request.get_json(silent=True) or {}
        tx_id = data.get('id')
        if not tx_id:
            raise AppError("Transaction id is required.", 400, code="MISSING_ID")
        tx = services.update_transaction(tx_id, data)
        if not tx:
            raise AppError("Transaction not found.", 404, code="TX_NOT_FOUND")
        return jsonify(CreditCardTransactionSchema().dump(tx)), 200

    # DELETE
    tx_id = request.args.get('transaction_id', type=int)
    if not tx_id:
        raise AppError("Transaction id is required.", 400, code="MISSING_ID")
    deleted = services.delete_transaction(tx_id)
    if not deleted:
        raise AppError("Transaction not found.", 404, code="TX_NOT_FOUND")
    return jsonify({"message": "Transaction deleted successfully"}), 200


@credit_cards_bp.route('/credit-cards/transactions/by-bill/<string:bill_id>', methods=['GET'])
@route_logger
def get_transactions_by_bill_id(bill_id):
    txs = services.get_transactions_by_bill_id(bill_id)
    return jsonify(CreditCardTransactionSchema(many=True).dump(txs)), 200


@credit_cards_bp.route('/credit-cards/<int:card_id>/transactions/bulk', methods=['POST'])
@route_logger
def bulk_import_transactions(card_id):
    """
    Bir kredi kartına toplu olarak harcama işlemleri aktarır.
    """
    data = request.get_json(silent=True) or {}
    txs = data.get('transactions')
    if not isinstance(txs, list) or not txs:
        raise AppError("A non-empty 'transactions' list is required.", 400, code="INVALID_PAYLOAD")

    try:
        services.bulk_add_transactions_to_card(card_id=card_id, transactions_data=txs)
        # Not: commit/rollback servis içinde yönetilmiyorsa aşağıdaki 2 satırda tutabilirsiniz:
        # from app import db
        # db.session.commit()
    except ValueError as ve:
        # servis bazı durumlarda ValueError fırlatıyorsa 400’e mapleyelim (iş kuralı/validasyon)
        raise AppError(str(ve), 400, code="BULK_VALIDATION")

    return jsonify({"message": f"{len(txs)} transaction(s) imported."}), 201


@credit_cards_bp.route('/credit-cards/transactions/billed', methods=['GET'])
@route_logger
def get_all_billed_transactions():
    txs = services.get_all_billed_transactions()
    return jsonify(CreditCardTransactionSchema(many=True).dump(txs)), 200


@credit_cards_bp.route('/credit-cards/daily-limits/<int:year>/<int:month>', methods=['GET'], endpoint='get_daily_limits')
@route_logger
def get_daily_limits(year, month):
    data = services.get_daily_limits_for_month(year, month)
    return jsonify(data), 200


@credit_cards_bp.route('/credit-cards/daily-entries', methods=['POST'], endpoint='save_daily_limits')
@route_logger
def save_daily_limits():
    data = request.get_json(silent=True)
    if not data:
        raise AppError("Request body is required.", 400, code="EMPTY_BODY")
    try:
        result = services.save_daily_limits(data)
    except ValueError as e:
        raise AppError(str(e), 400, code="LIMITS_VALIDATION")
    return jsonify(result), 200

