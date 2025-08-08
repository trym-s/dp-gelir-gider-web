import yfinance as yf
from datetime import datetime
import pytz # Saat dilimi dönüşümü için

class ExchangeRateService:
    def get_current_rates(self):
        currency_pairs = {
            "USD": "USDTRY=X",
            "EUR": "EURTRY=X",
            "GBP": "GBPTRY=X",
            "AED": "AEDTRY=X"
        }
        results = {}
        last_data_timestamp = None # Verinin kendi zaman damgası için değişken

        for currency, symbol in currency_pairs.items():
            try:
                ticker = yf.Ticker(symbol)
                # Gün içi en güncel veriyi almak için periyodu "1d" ve interval'i "1h" yapabiliriz
                hist = ticker.history(period="1d", interval="1h") 
                
                if not hist.empty:
                    price = hist["Close"].iloc[-1]
                    results[currency] = round(price, 4)

                    # --- GÜNCELLEME: Verinin kendi zaman damgasını al ---
                    # hist.index[-1], verinin en son kaydının zaman damgasını verir.
                    # Bu bilgiyi sadece ilk başarılı API çağrısında almamız yeterli.
                    if last_data_timestamp is None:
                        last_data_timestamp = hist.index[-1]
                else:
                    results[currency] = "Veri alinamadi"
            except Exception as e:
                results[currency] = f"Hata: {e}"
        
        # Zaman damgasını Türkiye saatine çevir ve formatla
        formatted_timestamp = "Bilinmiyor"
        if last_data_timestamp:
            # yfinance genellikle UTC zaman damgası döndürür.
            if last_data_timestamp.tzinfo is None:
                last_data_timestamp = pytz.utc.localize(last_data_timestamp)
            
            istanbul_tz = pytz.timezone('Europe/Istanbul')
            local_time = last_data_timestamp.astimezone(istanbul_tz)
            formatted_timestamp = local_time.strftime('%d %b %Y, %H:%M:%S %Z')

        return {
            "rates": results,
            "last_updated": formatted_timestamp # Yanıta verinin kendi zamanını ekle
        }
