import re

def parse_amount(raw):
    """
    Farklı formatlardaki (örn: 1.234,56 veya 1,234.56) metin tutarlarını
    güvenli bir şekilde float'a çevirir.
    """
    try:
        raw = str(raw).replace(' ', '').replace('\xa0', '')
        if raw.startswith('+'):
            sign = 1
            raw = raw[1:]
        elif raw.startswith('-'):
            sign = -1
            raw = raw[1:]
        else:
            sign = 1

        if raw.count(',') == 1 and raw.count('.') == 1:
            raw = raw.replace(',', '')
        elif raw.count('.') > 1:
            raw = raw.replace('.', '').replace(',', '.')
        elif raw.count(',') > 1:
            raw = raw.replace(',', '')
        elif ',' in raw:
            raw = raw.replace(',', '.')
            
        return round(float(raw) * sign, 2)
    except (ValueError, TypeError) as e:
        print(f"❌ Tutar dönüşüm hatası: '{raw}' → {e}")
        return None