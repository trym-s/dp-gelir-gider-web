from flask import Blueprint, jsonify
from .services import get_banks_with_accounts_data
from app.banks.services import get_bank_summary
import logging

dashboard_bp = Blueprint('dashboard_api', __name__, url_prefix='/api/dashboard')
banks_summary_bp = Blueprint('banks_summary_api', __name__, url_prefix='/api/banks')

@dashboard_bp.route('/banks-with-accounts', methods=['GET'])
def get_banks_with_accounts():
    try:
        data = get_banks_with_accounts_data()
        return jsonify(data)
    except Exception as e:
        logging.exception("Error getting banks with accounts for dashboard")
        return jsonify({"error": "An internal server error occurred"}), 500

@banks_summary_bp.route('/<int:bank_id>/summary', methods=['GET'])
def get_bank_summary_route(bank_id):
    """
    Belirli bir banka için varlık, kredi kartı borcu ve kredi borcu
    özetini döndürür.
    """
    try:
        summary_data = get_bank_summary(bank_id)
        if not summary_data:
            return jsonify({'message': 'Banka bulunamadı veya özet bilgisi yok.'}), 404
            
        return jsonify(summary_data), 200
    except Exception as e:
        # Hata yönetimi için loglama eklemek iyi bir pratik olacaktır.
        return jsonify({'error': str(e)}), 500
