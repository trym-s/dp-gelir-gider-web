from flask import Blueprint, request, jsonify
import logging
from . import services
from .schemas import CreditCardSchema, CreditCardTransactionSchema, CardBrandSchema

credit_cards_bp = Blueprint('credit_cards_api', __name__, url_prefix='/api')

@credit_cards_bp.route('/card-brands', methods=['GET', 'POST'])
def handle_card_brands():
    if request.method == 'GET':
        try:
            brands = services.get_all_card_brands()
            return jsonify(CardBrandSchema(many=True).dump(brands)), 200
        except Exception as e:
            logging.exception("Error in get_all_card_brands")
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'POST':
        try:
            brand = services.create_card_brand(request.json)
            return jsonify(CardBrandSchema().dump(brand)), 201
        except Exception as e:
            logging.exception("Error in create_card_brand")
            return jsonify({"error": "An internal server error occurred."}), 500

@credit_cards_bp.route('/card-brands/<int:brand_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_single_card_brand(brand_id):
    if request.method == 'GET':
        try:
            brand = services.get_card_brand_by_id(brand_id)
            if not brand:
                return jsonify({"error": "Card brand not found"}), 404
            return jsonify(CardBrandSchema().dump(brand)), 200
        except Exception as e:
            logging.exception("Error in get_card_brand_by_id")
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'PUT':
        try:
            brand = services.update_card_brand(brand_id, request.json)
            if not brand:
                return jsonify({"error": "Card brand not found"}), 404
            return jsonify(CardBrandSchema().dump(brand)), 200
        except Exception as e:
            logging.exception("Error in update_card_brand")
            return jsonify({"error": "An internal server error occurred."}), 500

    if request.method == 'DELETE':
        try:
            deleted = services.delete_card_brand(brand_id)
            if not deleted:
                return jsonify({"error": "Card brand not found"}), 404
            return jsonify({"message": "Card brand deleted successfully"}), 200
        except Exception as e:
            logging.exception("Error in delete_card_brand")
            return jsonify({"error": str(e)}), 500

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

@credit_cards_bp.route('/credit-cards/<int:card_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_credit_card(card_id):
    if request.method == 'GET':
        try:
            card = services.get_credit_card_by_id(card_id)
            if not card:
                return jsonify({'message': 'Credit card not found'}), 404
            return jsonify(CreditCardSchema().dump(card)), 200
        except Exception as e:
            logging.exception("Error in get_credit_card_by_id")
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'PUT':
        try:
            card = services.update_credit_card(card_id, request.json)
            if not card:
                return jsonify({'message': 'Credit card not found'}), 404
            return jsonify(CreditCardSchema().dump(card)), 200
        except Exception as e:
            logging.exception(f"Error updating credit card with id {card_id}")
            return jsonify({"message": "An error occurred while updating the credit card."}), 500

    if request.method == 'DELETE':
        try:
            deleted = services.delete_credit_card(card_id)
            if not deleted:
                return jsonify({"error": "Credit card not found"}), 404
            return jsonify({"message": "Credit card deleted successfully"}), 200
        except Exception as e:
            logging.exception("Error in delete_credit_card")
            return jsonify({"error": str(e)}), 500

@credit_cards_bp.route('/credit-cards/<int:card_id>/transactions', methods=['GET', 'POST', 'PUT', 'DELETE'])
def handle_transactions(card_id):
    if request.method == 'GET':
        try:
            transactions = services.get_transactions_for_card(card_id)
            return jsonify(CreditCardTransactionSchema(many=True).dump(transactions)), 200
        except Exception as e:
            logging.exception("Error in get_transactions_for_card")
            return jsonify({"error": str(e)}), 500

    if request.method == 'POST':
        try:
            transaction = services.add_transaction_to_card(card_id, request.json)
            if not transaction:
                return jsonify({'message': 'Credit card not found'}), 404
            return jsonify(CreditCardTransactionSchema().dump(transaction)), 201
        except Exception as e:
            logging.exception("Error in add_transaction_to_card")
            return jsonify({"error": "An internal server error occurred."}), 500

    if request.method == 'PUT':
        transaction_id = request.json.get('id') # Assuming ID is in the request body for PUT
        if not transaction_id:
            return jsonify({"error": "Transaction ID is required for update"}), 400
        try:
            transaction = services.update_transaction(transaction_id, request.json)
            if not transaction:
                return jsonify({"error": "Transaction not found"}), 404
            return jsonify(CreditCardTransactionSchema().dump(transaction)), 200
        except Exception as e:
            logging.exception("Error in update_transaction")
            return jsonify({"error": "An internal server error occurred."}), 500

    if request.method == 'DELETE':
        transaction_id = request.args.get('transaction_id', type=int) # Assuming ID is in query params for DELETE
        if not transaction_id:
            return jsonify({"error": "Transaction ID is required for delete"}), 400
        try:
            deleted = services.delete_transaction(transaction_id)
            if not deleted:
                return jsonify({"error": "Transaction not found"}), 404
            return jsonify({"message": "Transaction deleted successfully"}), 200
        except Exception as e:
            logging.exception("Error in delete_transaction")
            return jsonify({"error": str(e)}), 500

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


@credit_cards_bp.route('credit-cards/daily-limits/<int:year>/<int:month>', methods=['GET'], endpoint='get_daily_limits')
def get_daily_limits(year, month):
    """Belirli bir aya ait günlük limit kayıtlarını getirir."""
    try:
        data = services.get_daily_limits_for_month(year, month)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": f"Günlük limitler alınırken hata: {e}"}), 500

# ## YENİ ENDPOINT ##
@credit_cards_bp.route('/credit-cards/daily-entries', methods=['POST'], endpoint='save_daily_limits')
def save_daily_limits():
    """Toplu günlük limit girişi yapar."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "İstek gövdesi boş olamaz."}), 400
    try:
        result = services.save_daily_limits(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Günlük limitler kaydedilirken hata: {e}")
        return jsonify({"message": "Limitler kaydedilirken bir hata oluştu."}), 500