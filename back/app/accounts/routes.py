# app/accounts/routes.py

from flask import Blueprint, request, jsonify
from . import services as accounts_services
from .schemas import account_schema # Doğrulama için kullanılabilir

## YENİ: Blueprint adı ve prefix'i güncellendi.
accounts_bp = Blueprint('accounts', __name__, url_prefix='/api/accounts')

@accounts_bp.route('/', methods=['GET'])
def list_accounts():
    """
    Sistemdeki tüm Vadesiz Hesapları, durum ve bakiye detaylarıyla listeler.
    URL'den ?date=YYYY-MM-DD parametresi alabilir.
    """
    try:
        date_str = request.args.get('date', None)
        accounts_data = accounts_services.get_all_accounts_with_details(date_str)
        return jsonify(accounts_data), 200
    except Exception as e:
        return jsonify({"message": f"Hesaplar alınırken hata: {e}"}), 500

@accounts_bp.route('/daily-balances/<int:year>/<int:month>', methods=['GET'])
def get_daily_balances(year, month):
    """
    Belirli bir aya ait günlük bakiye kayıtlarını (pivot tablo için) getirir.
    """
    try:
        balances_data = accounts_services.get_daily_balances_for_month(year, month)
        return jsonify(balances_data), 200
    except Exception as e:
        return jsonify({"message": f"Günlük bakiyeler alınırken hata: {e}"}), 500

@accounts_bp.route('/daily-entries', methods=['POST'])
def add_daily_entries():
    """Toplu günlük bakiye girişi yapar."""
    data = request.get_json()
    if not isinstance(data, list) or not data:
        return jsonify({"message": "Geçersiz format. Liste bekleniyor."}), 400
    try:
        result = accounts_services.save_daily_entries(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        return jsonify({"message": f"Günlük girişler kaydedilirken hata: {e}"}), 500

@accounts_bp.route('/', methods=['POST'])
def create_account():
    """Yeni bir Vadesiz Hesap oluşturur."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "İstek gövdesi boş olamaz."}), 400

    try:
        new_account = accounts_services.create_new_account(data)
        return jsonify(new_account), 201 # 201 Created
    except ValueError as e: # Servisten gelen hata (örn: bank_id yok, isim tekrarı)
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Hesap oluşturulurken beklenmedik hata: {e}")
        return jsonify({"message": "Hesap oluşturulurken bir hata oluştu."}), 500

