from flask import Blueprint, request, jsonify
import logging
from . import services
from .schemas import CreditCardSchema, CreditCardTransactionSchema, CardBrandSchema

credit_cards_bp = Blueprint('credit_cards_api', __name__, url_prefix='/api')

@credit_cards_bp.route('/card-brands', methods=['GET', 'POST'])
def handle_card_brands():
    if request.method == 'GET':
        brands = services.get_all_card_brands()
        return jsonify(CardBrandSchema(many=True).dump(brands)), 200
    
    if request.method == 'POST':
        brand = services.create_card_brand(request.json)
        return jsonify(CardBrandSchema().dump(brand)), 201

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

@credit_cards_bp.route('/credit-cards/<int:card_id>/transactions/bulk', methods=['POST']) # Bu Yanlis yerde
# @jwt_required() -> KİMLİK DOĞRULAMA GEÇİCİ OLARAK KALDIRILDI
def bulk_import_transactions(card_id):
    """
    Bir kredi kartına toplu olarak harcama işlemleri aktarır.
    """
    # user_id = get_jwt_identity() -> KULLANICI KİMLİĞİ ALMA İŞLEMİ KALDIRILDI
    data = request.get_json()
    transactions_list = data.get('transactions')

    if not transactions_list or not isinstance(transactions_list, list):
        return jsonify({"error": "Geçerli bir 'transactions' listesi gönderilmelidir."}), 400
    
    try:
        # Servis katmanındaki iş mantığını user_id olmadan çağırıyoruz
        services.bulk_add_transactions_to_card(
            card_id=card_id,
            transactions_data=transactions_list
        )
        services.db.session.commit()

        return jsonify({
            "message": f"{len(transactions_list)} adet işlem başarıyla eklendi."
        }), 201

    except ValueError as ve:
        services.db.session.rollback()
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        services.db.session.rollback()
        logging.exception(f"Toplu harcama aktarımı sırasında hata oluştu (Kart ID: {card_id})")
        return jsonify({"error": "İşlem sırasında sunucuda bir hata oluştu."}), 500