import logging
from flask import Blueprint, request, jsonify
from . import services
from .schemas import BankSchema, BankAccountSchema, KmhLimitSchema, DailyRiskSchema, BankAccountStatusHistorySchema
from datetime import datetime

logging.basicConfig(level=logging.INFO)

# Existing Blueprints
banks_bp = Blueprint('banks_api', __name__, url_prefix='/api')
bank_status_bp = Blueprint('bank_status_api', __name__, url_prefix='/api/bank_status')

# New Blueprint for KMH functionalities
kmh_bp = Blueprint('kmh_api', __name__, url_prefix='/api/kmh')

# --- Bank and BankAccount Routes (largely unchanged) ---
@banks_bp.route('/banks', methods=['GET', 'POST'])
def handle_banks():
    if request.method == 'GET':
        try:
            banks = services.get_all_banks()
            return jsonify(BankSchema(many=True).dump(banks)), 200
        except Exception as e:
            logging.exception("Error in get_all_banks")
            return jsonify({"error": str(e)}), 500
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request must be JSON"}), 400
        try:
            bank = services.create_bank(data)
            return jsonify(BankSchema().dump(bank)), 201
        except Exception as e:
            logging.exception("Error in create_bank")
            return jsonify({"error": "An internal server error occurred."}), 500

@banks_bp.route('/banks/<int:bank_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_single_bank(bank_id):
    if request.method == 'GET':
        try:
            bank = services.get_bank_by_id(bank_id)
            if not bank:
                return jsonify({"error": "Bank not found"}), 404
            return jsonify(BankSchema().dump(bank)), 200
        except Exception as e:
            logging.exception("Error in get_bank_by_id")
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request must be JSON"}), 400
        try:
            bank = services.update_bank(bank_id, data)
            if not bank:
                return jsonify({"error": "Bank not found"}), 404
            return jsonify(BankSchema().dump(bank)), 200
        except Exception as e:
            logging.exception("Error in update_bank")
            return jsonify({"error": "An internal server error occurred."}), 500

    if request.method == 'DELETE':
        try:
            deleted = services.delete_bank(bank_id)
            if not deleted:
                return jsonify({"error": "Bank not found"}), 404
            return jsonify({"message": "Bank deleted successfully"}), 200
        except Exception as e:
            logging.exception("Error in delete_bank")
            return jsonify({"error": str(e)}), 500

@banks_bp.route('/banks/<int:bank_id>/summary', methods=['GET'])
def get_bank_summary_route(bank_id):
    try:
        summary = services.get_bank_summary(bank_id)
        return jsonify(summary), 200
    except Exception as e:
        logging.exception("Error in get_bank_summary_route")
        return jsonify({"error": str(e)}), 500

@banks_bp.route('/bank-accounts', methods=['GET', 'POST'])
def handle_bank_accounts():
    if request.method == 'GET':
        logging.info("GET request received for /bank-accounts")
        try:
            accounts = services.get_all_bank_accounts()
            logging.info(f"Successfully fetched {len(accounts)} bank accounts.")
            return jsonify(BankAccountSchema(many=True).dump(accounts)), 200
        except Exception as e:
            logging.error(f"Error in get_all_bank_accounts: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500
    if request.method == 'POST':
        logging.info("POST request received for /bank-accounts")
        data = request.get_json()
        if not data:
            logging.warning("POST request to /bank-accounts received with no JSON data.")
            return jsonify({"error": "Request must be JSON"}), 400
        logging.debug(f"Received data for create_bank_account: {data}")
        try:
            account = services.create_bank_account(data)
            logging.info(f"Successfully created bank account with ID: {account.id}")
            return jsonify(BankAccountSchema().dump(account)), 201
        except ValueError as ve:
            logging.error(f"Validation error creating bank account: {ve}")
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logging.error(f"Unexpected error creating bank account: {e}", exc_info=True)
            return jsonify({"error": "An internal server error occurred."}), 500

@banks_bp.route('/bank-accounts/<int:account_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_single_bank_account(account_id):
    if request.method == 'GET':
        logging.info(f"GET request received for /bank-accounts/{account_id}")
        try:
            account = services.get_bank_account_by_id(account_id)
            if not account:
                logging.warning(f"Bank account with ID {account_id} not found.")
                return jsonify({"error": "Bank account not found"}), 404
            logging.info(f"Successfully fetched bank account with ID: {account_id}")
            return jsonify(BankAccountSchema().dump(account)), 200
        except Exception as e:
            logging.error(f"Error in get_bank_account_by_id for ID {account_id}: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'PUT':
        logging.info(f"PUT request received for /bank-accounts/{account_id}")
        data = request.get_json()
        if not data:
            logging.warning(f"PUT request to /bank-accounts/{account_id} received with no JSON data.")
            return jsonify({"error": "Request must be JSON"}), 400
        logging.debug(f"Received data for update_bank_account for ID {account_id}: {data}")
        try:
            account = services.update_bank_account(account_id, data)
            if not account:
                logging.warning(f"Bank account with ID {account_id} not found for update.")
                return jsonify({"error": "Bank account not found"}), 404
            logging.info(f"Successfully updated bank account with ID: {account_id}")
            return jsonify(BankAccountSchema().dump(account)), 200
        except ValueError as ve:
            logging.error(f"Validation error updating bank account with ID {account_id}: {ve}")
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logging.error(f"Unexpected error updating bank account with ID {account_id}: {e}", exc_info=True)
            return jsonify({"error": "An internal server error occurred."}), 500

    if request.method == 'DELETE':
        logging.info(f"DELETE request received for /bank-accounts/{account_id}")
        try:
            deleted = services.delete_bank_account(account_id)
            if not deleted:
                logging.warning(f"Bank account with ID {account_id} not found for deletion.")
                return jsonify({"error": "Bank account not found"}), 404
            logging.info(f"Successfully deleted bank account with ID: {account_id}")
            return jsonify({"message": "Bank account deleted successfully"}), 200
        except Exception as e:
            logging.error(f"Error in delete_bank_account for ID {account_id}: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500

# ... other existing bank and bank_account routes ...

# --- KMH Routes ---
@kmh_bp.route('/', methods=['GET'])
def get_kmh_accounts_route():
    """Endpoint to get all KMH accounts with their details."""
    logging.info("GET request received for /api/kmh/")
    try:
        accounts = services.get_kmh_accounts()
        logging.info(f"Successfully fetched {len(accounts)} KMH accounts.")
        return jsonify(accounts), 200
    except Exception as e:
        logging.error(f"Error in get_kmh_accounts_route: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@kmh_bp.route('/', methods=['POST'])
def create_kmh_limit_route():
    """Endpoint to create a new KMH limit."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request must be JSON"}), 400
    try:
        new_limit = services.create_kmh_limit(data)
        return jsonify(KmhLimitSchema().dump(new_limit)), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logging.exception("Error in create_kmh_limit_route")
        return jsonify({"error": "An internal server error occurred."}), 500

@kmh_bp.route('/daily-risks/<int:year>/<int:month>', methods=['GET'])
def get_daily_risks_route(year, month):
    """Endpoint to get daily risks for a specific month."""
    try:
        risks = services.get_daily_risks_for_month(year, month)
        return jsonify(risks), 200
    except Exception as e:
        logging.exception("Error in get_daily_risks_route")
        return jsonify({"error": str(e)}), 500

@kmh_bp.route('/daily-entries', methods=['POST'])
def save_daily_risk_entries_route():
    """Endpoint to save a batch of daily risk entries."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request must be JSON"}), 400
    try:
        result = services.save_daily_risk_entries(data)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logging.exception("Error in save_daily_risk_entries_route")
        return jsonify({"error": "An internal server error occurred."}), 500

@bank_status_bp.route('/accounts-with-status', methods=['GET'])
def get_accounts_with_status():
    try:
        accounts = services.get_all_bank_accounts() # Assuming this returns accounts with status
        return jsonify(BankAccountSchema(many=True).dump(accounts)), 200
    except Exception as e:
        logging.exception("Error in get_accounts_with_status")
        return jsonify({"error": str(e)}), 500

@bank_status_bp.route('/balance_history', methods=['GET'])
def get_balance_history():
    bank_name = request.args.get('bank_name')
    account_name = request.args.get('account_name')
    try:
        history = services.get_balance_history_for_account(bank_name, account_name)
        return jsonify(history), 200
    except Exception as e:
        logging.exception("Error in get_balance_history")
        return jsonify({"error": str(e)}), 500

# --- Routes for Vadesiz Account Daily Balances (Refactored) ---
@bank_status_bp.route('/daily_balances/<int:year>/<int:month>', methods=['GET'])
def get_daily_balances_route(year, month):
    try:
        balances = services.get_daily_balances_for_month(year, month)
        return jsonify(balances), 200
    except Exception as e:
        logging.exception("Error getting daily balances")
        return jsonify({"error": str(e)}), 500

@bank_status_bp.route('/daily_entries', methods=['POST'])
def save_daily_balance_entries_route(): # Renamed for clarity
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request must be JSON"}), 400
    try:
        services.save_daily_balance_entries(data)
        return jsonify({"message": "Daily balance entries saved successfully"}), 200
    except Exception as e:
        logging.exception("Error saving daily balance entries")
        return jsonify({"error": str(e)}), 500

@bank_status_bp.route('/status-history/', methods=['GET', 'POST'])
def handle_status_history():
    if request.method == 'GET':
        subject_type = request.args.get('subject_type')
        subject_id = request.args.get('subject_id', type=int)
        try:
            history = services.get_status_history(subject_type, subject_id)
            return jsonify(BankAccountStatusHistorySchema(many=True).dump(history)), 200
        except Exception as e:
            logging.exception("Error in get_status_history")
            return jsonify({"error": str(e)}), 500
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request must be JSON"}), 400
        try:
            result = services.save_status(data)
            return jsonify(result), 200
        except Exception as e:
            logging.exception("Error in save_status")
            return jsonify({"error": str(e)}), 500

# ... (The rest of the status history routes can remain as they are, 
# but might need future adaptation for KMH)