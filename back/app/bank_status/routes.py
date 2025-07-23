# back/app/bank_status/routes.py

from flask import Blueprint, request, jsonify
from datetime import datetime # Tarih stringlerini parse etmek için (eğer frontend'den geliyorsa)

# Hizmet katmanından fonksiyonları import et
from . import services as bank_status_services
# Schema'ları import et (eğer route seviyesinde doğrulamalar yapılacaksa)
from .schemas import daily_balance_schema, account_schema # Doğrulama için

# Blueprint'i tanımla
bank_status_bp = Blueprint('bank_status', __name__, url_prefix='/api/bank_status')

@bank_status_bp.route('/accounts', methods=['GET'])
def get_accounts():
    """
    Sistemdeki tüm banka hesaplarını listeler.
    Frontend'deki açılır menüler ve banka kartı detayları için kullanılır.
    """
    try:
        accounts_data = bank_status_services.get_all_accounts()
        return jsonify(accounts_data), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Error fetching accounts: {e}")
        return jsonify({"message": "Hesaplar alınırken bir hata oluştu."}), 500

@bank_status_bp.route('/daily_balances/<int:year>/<int:month>', methods=['GET'])
def get_daily_balances(year, month):
    """
    Belirli bir ay ve yıla ait günlük bakiye kayıtlarını (pivot tablo için) getirir.
    """
    try:
        # Servis fonksiyonunu çağır
        balances_data = bank_status_services.get_daily_balances_for_month(year, month)
        return jsonify(balances_data), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Error fetching daily balances for {month}/{year}: {e}")
        return jsonify({"message": "Günlük bakiyeler alınırken bir hata oluştu."}), 500

@bank_status_bp.route('/daily_entries', methods=['POST'])
def add_daily_entries():
    """
    Frontend'den gelen günlük bakiye girişlerini (toplu) kaydeder.
    Gap kapatma mantığını tetikler.
    Request body: [{'banka': 'Banka Adı', 'hesap': 'Hesap Adı', 'tarih': 'DD.MM.YYYY', 'sabah': 123.45, 'aksam': 678.90}, ...]
    """
    data = request.get_json()

    if not isinstance(data, list) or not data:
        return jsonify({"message": "Geçersiz giriş formatı. Liste bekleniyor."}), 400

    try:
        # Marshmallow şeması ile gelen veriyi doğrula (opsiyonel, servis katmanında da yapılabilir)
        # Eğer tek bir şemadan tüm listeyi doğrulamak istersek:
        # validated_data = daily_balance_schema.load(data, many=True) # load() metodu tek bir obje için, many=True listeler için.
        # Ancak frontend'den gelen veri string isimler içerdiği için,
        # doğrulama daha çok servis katmanında ID'ye dönüştürülürken veya
        # elle kontrol edilerek yapılacaktır.

        # Servis fonksiyonunu çağır
        result = bank_status_services.save_daily_entries(data)
        return jsonify(result), 200 # İşlem başarılıysa 200 OK

    except ValueError as e:
        # Servis katmanından fırlatılan iş mantığı hatalarını yakala
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        # Diğer tüm beklenmedik hataları yakala
        print(f"Error saving daily entries: {e}")
        return jsonify({"message": "Günlük girişler kaydedilirken bir hata oluştu."}), 500

# --- Opsiyonel: Hesap Oluşturma/Güncelleme API'ları ---
# Eğer frontend'den hesapları yönetiyorsanız bu endpoint'ler de gerekebilir.
@bank_status_bp.route('/account', methods=['POST'])
def create_account():
    """Yeni bir banka hesabı oluşturur."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "Hesap bilgileri eksik."}), 400
    
    try:
        # Gelen veriyi şema ile doğrula
        validated_data = account_schema.load(data) # Deserializasyon ve doğrulama
        account = bank_status_services.create_account(validated_data)
        return jsonify(account), 201 # 201 Created
    except ValueError as e: # Servisten gelen hata (örn: bank_id yok)
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(f"Error creating account: {e}")
        return jsonify({"message": "Hesap oluşturulurken bir hata oluştu."}), 500

@bank_status_bp.route('/banks', methods=['GET'])
def get_banks():
    """Tüm bankaları listeler (mock data yerine DB'den)."""
    try:
        banks_data = bank_status_services.get_all_banks()
        return jsonify(banks_data), 200
    except Exception as e:
        print(f"Error fetching banks: {e}")
        return jsonify({"message": "Bankalar alınırken bir hata oluştu."}), 500