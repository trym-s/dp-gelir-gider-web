import yfinance as yf


class ExchangeRateService:
    def get_current_rates(self):
        currency_pairs = {
            "USD": "USDTRY=X",
            "EUR": "EURTRY=X",
            "GBP": "GBPTRY=X",
            "AED": "AEDTRY=X"
        }
        results = {}
        for currency, symbol in currency_pairs.items():
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="1d", interval="1h")
                if not hist.empty:
                    price = hist["Close"].iloc[-1]
                    results[currency] = round(price, 4)
                else:
                    results[currency] = "Veri alinamadi"
            except Exception as e:
                results[currency] = f"Hata: {e}"
        return results
