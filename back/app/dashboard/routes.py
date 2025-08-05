from flask import Blueprint, jsonify, request
from .services import get_banks_with_accounts_data, get_loan_summary_by_bank, get_credit_card_summary_by_bank, get_recent_transactions, generate_financial_health_chart_config, generate_daily_risk_chart_config, generate_daily_credit_limit_chart_config
from app.banks.services import get_bank_summary
from app.credit_cards.services import get_credit_cards_grouped_by_bank
from app.credit_cards.schemas import CreditCardSchema
import logging
import traceback

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
        bank_account_id = request.args.get('bank_account_id', type=int)
        summary_data = get_bank_summary(bank_id, bank_account_id)
        if not summary_data:
            return jsonify({'message': 'Banka bulunamadı veya özet bilgisi yok.'}), 404
            
        return jsonify(summary_data), 200
    except Exception as e:
        # Hata yönetimi için loglama eklemek iyi bir pratik olacaktır.
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/credit-cards-by-bank', methods=['GET'])
def get_credit_cards_by_bank():
    try:
        grouped_cards = get_credit_cards_grouped_by_bank()
        
        # Serialize the grouped data
        serialized_data = {}
        for bank_name, cards in grouped_cards.items():
            serialized_data[bank_name] = CreditCardSchema(many=True).dump(cards)
            
        return jsonify(serialized_data), 200
    except Exception as e:
        logging.error(f"Error in get_credit_cards_by_bank: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "An internal server error occurred", "details": repr(e)}), 500

@dashboard_bp.route('/loan-summary-by-bank', methods=['GET'])
def get_loan_summary():
    try:
        loan_summary = get_loan_summary_by_bank()
        return jsonify(loan_summary), 200
    except Exception as e:
        logging.error(f"Error in get_loan_summary: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "An internal server error occurred", "details": repr(e)}), 500

@dashboard_bp.route('/credit-card-summary-by-bank', methods=['GET'])
def get_credit_card_summary():
    try:
        credit_card_summary = get_credit_card_summary_by_bank()
        return jsonify(credit_card_summary), 200
    except Exception as e:
        logging.error(f"Error in get_credit_card_summary: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "An internal server error occurred", "details": repr(e)}), 500

@dashboard_bp.route('/recent-transactions', methods=['GET'])
def recent_transactions():
    """
    En son gelir ve gider işlemlerini birleşik bir liste olarak döndürür.
    """
    try:
        transactions = get_recent_transactions()
        return jsonify(transactions), 200
    except Exception as e:
        logging.exception("Son işlemler getirilirken hata oluştu.")
        return jsonify({"error": "Internal server error"}), 500

@dashboard_bp.route('/charts/financial-health/<int:bank_id>', methods=['GET'])
def get_financial_health_chart(bank_id):
    try:
        bank_account_id = request.args.get('bank_account_id', type=int)
        chart_config = generate_financial_health_chart_config(bank_id, bank_account_id)
        return jsonify(chart_config)
    except Exception as e:
        logging.exception("Error generating financial health chart")
        return jsonify({"error": "An internal server error occurred"}), 500

@dashboard_bp.route('/charts/daily-risk/<int:bank_id>', methods=['GET'])
def get_daily_risk_chart(bank_id):
    try:
        bank_account_id = request.args.get('bank_account_id', type=int)
        chart_config = generate_daily_risk_chart_config(bank_id, bank_account_id)
        return jsonify(chart_config)
    except Exception as e:
        logging.exception(f"Error generating daily risk chart for bank_id: {bank_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@dashboard_bp.route('/charts/daily-credit-limit/<int:bank_id>', methods=['GET'])
def get_daily_credit_limit_chart(bank_id):
    try:
        bank_account_id = request.args.get('bank_account_id', type=int)
        chart_config = generate_daily_credit_limit_chart_config(bank_id, bank_account_id)
        return jsonify(chart_config)
    except Exception as e:
        logging.exception(f"Error generating daily credit limit chart for bank_id: {bank_id}")
        return jsonify({"error": "An internal server error occurred"}), 500


