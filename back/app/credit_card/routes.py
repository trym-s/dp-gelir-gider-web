# app/credit_card/routes.py

from flask import Blueprint, request, jsonify
from . import services as cc_services

credit_card_bp = Blueprint('credit_card', __name__, url_prefix='/api/credit-cards')

@credit_card_bp.route('/', methods=['GET'], endpoint='list_credit_cards')
def list_credit_cards():
    """Tüm kredi kartlarını detaylarıyla listeler."""
    try:
        data = cc_services.get_all_credit_cards()
        return jsonify(data), 200
    except Exception as e:
        print(f"Kredi kartları listelenirken hata: {e}")
        return jsonify({"message": "Kredi kartları alınırken bir hata oluştu."}), 500

@credit_card_bp.route('/', methods=['POST'], endpoint='create_credit_card')
def create_credit_card():
    """Yeni bir kredi kartı oluşturur."""
    data = request.get_json()
    try:
        new_card = cc_services.create_new_credit_card(data)
        return jsonify(new_card), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Kredi kartı oluşturulurken hata: {e}")
        return jsonify({"message": "Kart oluşturulurken bir hata oluştu."}), 500

@credit_card_bp.route('/daily-limits/<int:year>/<int:month>', methods=['GET'], endpoint='get_daily_limits')
def get_daily_limits(year, month):
    """Belirli bir aya ait günlük limit kayıtlarını getirir."""
    try:
        data = cc_services.get_daily_limits_for_month(year, month)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": f"Günlük limitler alınırken hata: {e}"}), 500

# ## YENİ ENDPOINT ##
@credit_card_bp.route('/daily-entries', methods=['POST'], endpoint='save_daily_limits')
def save_daily_limits():
    """Toplu günlük limit girişi yapar."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "İstek gövdesi boş olamaz."}), 400
    try:
        result = cc_services.save_daily_limits(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Günlük limitler kaydedilirken hata: {e}")
        return jsonify({"message": "Limitler kaydedilirken bir hata oluştu."}), 500

@credit_card_bp.route('/brands', methods=['GET'], endpoint='list_card_brands')
def list_card_brands():
    """Tüm kart markalarını listeler."""
    try:
        data = cc_services.get_all_card_brands()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": f"Kart markaları alınırken hata: {e}"}), 500
        
@credit_card_bp.route('/brands', methods=['POST'], endpoint='create_card_brand')
def create_card_brand():
    """Yeni bir kart markası (Visa, Mastercard vb.) oluşturur."""
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"message": "'name' alanı zorunludur."}), 400
    try:
        new_brand = cc_services.create_new_card_brand(data)
        return jsonify(new_brand), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 409
    except Exception as e:
        print(f"Kart markası oluşturulurken hata: {e}")
        return jsonify({"message": "Kart markası oluşturulurken bir hata oluştu."}), 500
