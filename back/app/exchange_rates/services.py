# /back/app/exchange_rates/services.py
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExchangeRateService:
    BASE_URL = "https://api.frankfurter.app/latest"

    @staticmethod
    def get_current_rates():
        """
        Fetches the latest exchange rates for USD and EUR against TRY using a single API call.
        """
        logger.info("Attempting to fetch exchange rates...")
        try:
            params = {'from': 'TRY', 'to': 'USD,EUR'}
            logger.info(f"Requesting URL: {ExchangeRateService.BASE_URL} with params: {params}")
            
            response = requests.get(ExchangeRateService.BASE_URL, params=params, timeout=5)
            logger.info(f"Received status code: {response.status_code}")
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Received data: {data}")
            
            rates = data.get('rates')
            if not rates or 'USD' not in rates or 'EUR' not in rates:
                logger.error("API response is missing USD or EUR rates.")
                return None

            usd_rate_from_try = rates['USD']
            eur_rate_from_try = rates['EUR']
            logger.info(f"Rates from TRY: USD={usd_rate_from_try}, EUR={eur_rate_from_try}")

            if usd_rate_from_try == 0 or eur_rate_from_try == 0:
                logger.error("Received a zero rate, which would cause a division error.")
                return None

            usd_to_try = 1 / usd_rate_from_try
            eur_to_try = 1 / eur_rate_from_try
            logger.info(f"Calculated inverse rates: USD_TRY={usd_to_try}, EUR_TRY={eur_to_try}")

            return {
                "USD": usd_to_try,
                "EUR": eur_to_try
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"RequestException during exchange rate fetch: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred in get_current_rates: {e}", exc_info=True)
            return None
