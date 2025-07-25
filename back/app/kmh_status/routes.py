# app/kmh_status/routes.py
from flask import Blueprint, jsonify, request
from . import services as kmh_services

kmh_status_bp = Blueprint('kmh_status', __name__, url_prefix='/api/kmh_status')

@kmh_status_bp.route('/accounts', methods=['GET'])
def get_kmh_accounts():
    """
    KMH sayfasındaki kartları doldurmak için tüm KMH hesaplarını ve
    ilgili tanım bilgilerini getirir.
    """
    try:
        accounts_data = kmh_services.get_all_kmh_accounts()
        return jsonify(accounts_data), 200
    except Exception as e:
        print(f"Error fetching KMH accounts: {e}")
        return jsonify({"message": "KMH hesapları alınırken bir hata oluştu."}), 500

@kmh_status_bp.route('/daily_risks/<int:year>/<int:month>', methods=['GET'])
def get_daily_risks(year, month):
    """
    Belirli bir ay ve yıla ait günlük risk kayıtlarını (pivot tablo için) getirir.
    """
    try:
        risks_data = kmh_services.get_daily_risks_for_month(year, month)
        return jsonify(risks_data), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Error fetching daily risks for {month}/{year}: {e}")
        return jsonify({"message": "Günlük riskler alınırken bir hata oluştu."}), 500

@kmh_status_bp.route('/daily_entries', methods=['POST'])
def add_daily_entries():
    """
    Frontend'den gelen günlük risk girişlerini (toplu) kaydeder.
    Gap kapatma mantığını tetikler.
    """
    data = request.get_json()

    if not isinstance(data, list) or not data:
        return jsonify({"message": "Geçersiz giriş formatı. Liste bekleniyor."}), 400

    try:
        result = kmh_services.save_daily_risks(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Error saving daily risk entries: {e}")
        return jsonify({"message": "Günlük risk girişleri kaydedilirken bir hata oluştu."}), 500
