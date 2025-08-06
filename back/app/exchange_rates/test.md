import yfinance as yf

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
        hist = ticker.history(period="1h")
        if not hist.empty:
            price = hist["Close"].iloc[-1]
            results[currency] = round(price, 4)
            print(hist[['Open', 'High', 'Low', 'Close', 'Volume']])
        else:
            results[currency] = "Veri alinamadi"
    except Exception as e:
        results[currency] = f"Hata: {e}"

print("Döviz Kurları (TRY):")
for currency, rate in results.items():
    print(f"{currency} → TRY: {rate}")
