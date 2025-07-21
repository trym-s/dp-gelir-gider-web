# /back/app/bank_logs/routes.py
from flask import Blueprint, request, jsonify
from .services import BankaLogService

bank_logs_bp = Blueprint('bank_logs_bp', __name__, url_prefix='/bank-logs')

@bank_logs_bp.route('/', methods=['GET'])
def get_bank_logs():
    """
    Belirli bir tarih ve periyot için tüm bankaların log'larını getirir.
    Query parametreleri:
    - date (YYYY-MM-DD formatında)
    - period ('morning' veya 'evening')
    """
    date_str = request.args.get('date')
    period_str = request.args.get('period')

    if not date_str or not period_str:
        return jsonify({"error": "Tarih ve periyot parametreleri zorunludur."}), 400

    try:
        logs = BankaLogService.get_all_bank_logs_for_period(date_str, period_str)
        return jsonify(logs), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        # Genel bir hata yakalama
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500

@bank_logs_bp.route('/', methods=['POST'])
def update_bank_log():
    """
    Yeni bir banka log'u oluşturur veya mevcut birini günceller.
    JSON body'si ön yüzdeki `api.updateBalance` fonksiyonunun gönderdiği
    veriye uygun olmalıdır.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "İstek gövdesi boş olamaz."}), 400

    try:
        updated_log = BankaLogService.create_or_update_bank_log(data)
        return jsonify(updated_log), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        # Genel bir hata yakalama
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500
