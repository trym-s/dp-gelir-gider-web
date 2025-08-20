from flask import Blueprint, jsonify
from .services import ExchangeRateService

exchange_rates_bp = Blueprint('exchange_rates', __name__, url_prefix='/api/exchange_rates')
service = ExchangeRateService()

@exchange_rates_bp.route('/', methods=['GET'])
def get_exchange_rates():
    """
    Get current exchange rates.
    ---
    tags:
      - Exchange Rates
    responses:
      200:
        description: A JSON object containing the current exchange rates.
    """
    rates = service.get_current_rates()
    return jsonify(rates)
