# /back/app/bank_logs/routes.py
from flask import request, jsonify
from app.route_factory import create_api_blueprint
from .services import bank_log_service
from .schemas import BankLogSchema
from .models import BankLog # Import the model
import logging

# 1. Create the standard CRUD blueprint using the factory
bank_logs_bp = create_api_blueprint('bank-logs', bank_log_service, BankLogSchema())

# 2. Add the custom route for fetching logs by period
@bank_logs_bp.route('/by-period', methods=['GET'])
def get_bank_logs_by_period():
    """
    Gets all bank logs for a specific date and period.
    If a log doesn't exist for a bank, a placeholder is returned.
    """
    date_str = request.args.get('date')
    period_str = request.args.get('period')

    if not date_str or not period_str:
        return jsonify({"error": "Date and period query parameters are required."}), 400

    try:
        logs = bank_log_service.get_all_logs_for_period(date_str, period_str)
        schema = BankLogSchema()
        # The service now returns a mix of serializable dicts and model instances.
        # We only need to dump the model instances.
        result_data = [schema.dump(log) if isinstance(log, BankLog) else log for log in logs]
        return jsonify(result_data), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Error fetching logs by period")
        return jsonify({"error": "An internal server error occurred."}), 500

# 3. Add a custom route for single upsert
@bank_logs_bp.route('/upsert', methods=['POST'])
def upsert_bank_log():
    """
    Creates or updates a single bank log.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body cannot be empty."}), 400

    try:
        updated_log = bank_log_service.create_or_update_log(data)
        return jsonify(BankLogSchema().dump(updated_log)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Error during bank log upsert")
        return jsonify({"error": "An internal server error occurred."}), 500

# 4. Add the new route for batch upsert
@bank_logs_bp.route('/batch-upsert', methods=['POST'])
def batch_upsert_bank_logs():
    """
    Creates or updates a list of bank logs in a single transaction.
    """
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"error": "Request body must be a non-empty list."}), 400

    try:
        updated_logs = bank_log_service.batch_upsert_logs(data)
        return jsonify(BankLogSchema(many=True).dump(updated_logs)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Error during bank log batch upsert")
        return jsonify({"error": "An internal server error occurred."}), 500