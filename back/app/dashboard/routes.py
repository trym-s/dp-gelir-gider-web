from flask import Blueprint, jsonify
from .services import get_banks_with_accounts_data
import logging

dashboard_bp = Blueprint('dashboard_api', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/banks-with-accounts', methods=['GET'])
def get_banks_with_accounts():
    try:
        data = get_banks_with_accounts_data()
        return jsonify(data)
    except Exception as e:
        logging.exception("Error getting banks with accounts for dashboard")
        return jsonify({"error": "An internal server error occurred"}), 500
