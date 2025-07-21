# /back/app/exchange_rates/routes.py
from flask import Blueprint, jsonify
from .services import ExchangeRateService

exchange_rates_bp = Blueprint('exchange_rates_bp', __name__, url_prefix='/rates')

@exchange_rates_bp.route('/', methods=['GET'])
def get_rates():
    """
    Provides the current exchange rates for USD and EUR against TRY.
    """
    rates = ExchangeRateService.get_current_rates()
    if rates:
        return jsonify(rates), 200
    else:
        return jsonify({"error": "Döviz kurları alınamadı."}), 503 # Service Unavailable
