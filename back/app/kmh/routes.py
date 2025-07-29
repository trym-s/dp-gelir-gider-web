
from flask import Blueprint, request, jsonify
from . import services as kmh_services
from .schemas import kmh_limit_schema

# Blueprint'i tanımla
kmh_bp = Blueprint('kmh', __name__, url_prefix='/api/kmh')

@kmh_bp.route('/', methods=['GET'], endpoint='list_kmh_limits')
def list_kmh_limits():
    """Tüm KMH limitlerini, detaylarıyla birlikte listeler."""
    try:
        data = kmh_services.get_all_kmh_limits()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": f"KMH limitleri alınırken hata: {e}"}), 500

@kmh_bp.route('/', methods=['POST'], endpoint='create_kmh_limit')
def create_kmh_limit():
    """Yeni bir KMH Limiti oluşturur."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "İstek gövdesi boş olamaz."}), 400
    
    try:
        new_kmh = kmh_services.create_new_kmh_limit(data)
        return jsonify(new_kmh), 201
    except ValueError as e:
        # Servis katmanından gelen kontrollü hatalar (örn: hesap bulunamadı)
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        # Beklenmedik diğer hatalar
        print(f"KMH oluşturulurken beklenmedik hata: {e}")
        return jsonify({"message": "KMH Limiti oluşturulurken bir hata oluştu."}), 500

@kmh_bp.route('/daily-risks/<int:year>/<int:month>', methods=['GET'], endpoint='get_daily_risks')
def get_daily_risks(year, month):
    """Belirli bir aya ait günlük risk kayıtlarını getirir."""
    try:
        data = kmh_services.get_daily_risks_for_month(year, month)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": f"Günlük riskler alınırken hata: {e}"}), 500

@kmh_bp.route('/daily-entries', methods=['POST'], endpoint='add_daily_risk_entries')
def add_daily_risk_entries():
    """Toplu günlük risk girişi yapar."""
    data = request.get_json()
    if not isinstance(data, list) or not data:
        return jsonify({"message": "Geçersiz format. Liste bekleniyor."}), 400
    try:
        result = kmh_services.save_daily_risks(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": f"Günlük riskler kaydedilirken hata: {e}"}), 500