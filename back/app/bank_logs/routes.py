# /back/app/bank_logs/routes.py
from flask import request, jsonify
from app.route_factory import create_api_blueprint
from .services import bank_log_service
from .schemas import BankLogSchema
import logging

# 1. Create the standard CRUD blueprint using the factory
bank_logs_bp = create_api_blueprint('bank-logs', bank_log_service, BankLogSchema())

# 2. Add the custom route for fetching logs by period
@bank_logs_bp.route('/by-period', methods=['GET'])
def get_bank_logs_by_period():
    """
    Gets all bank logs for a specific date and period.
    If a log doesn't exist for a bank, a placeholder is returned.
    Query params:
    - date (YYYY-MM-DD)
    - period ('morning' or 'evening')
    """
    date_str = request.args.get('date')
    period_str = request.args.get('period')

    if not date_str or not period_str:
        return jsonify({"error": "Date and period query parameters are required."}), 400

    try:
        logs = bank_log_service.get_all_logs_for_period(date_str, period_str)
        
        # Manually serialize since the list can contain a mix of model instances and dicts
        schema = BankLogSchema()
        result_data = []
        for log in logs:
            if isinstance(log, dict):
                # It's already a placeholder dict, just make sure bank is serialized
                if 'bank' in log and not isinstance(log['bank'], dict):
                     log['bank'] = {'id': log['bank'].id, 'name': log['bank'].name, 'logo_url': log['bank'].logo_url}
                result_data.append(log)
            else:
                result_data.append(schema.dump(log))

        return jsonify(result_data), 200
    except ValueError as e:
        logging.warning(f"Value error while fetching logs by period: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Error fetching logs by period")
        return jsonify({"error": "An internal server error occurred."}), 500

# 3. Add a custom route for creating/updating a log
@bank_logs_bp.route('/upsert', methods=['POST'])
def upsert_bank_log():
    """
    Creates a new bank log or updates an existing one based on the composite key
    (bank_id, date, period). This is used by the frontend to save changes.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body cannot be empty."}), 400

    try:
        # The service handles the logic of finding or creating
        updated_log = bank_log_service.create_or_update_log(data)
        return jsonify(BankLogSchema().dump(updated_log)), 200
    except ValueError as e:
        logging.warning(f"Value error while upserting bank log: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Error during bank log upsert")
        return jsonify({"error": "An internal server error occurred."}), 500