import re

def parse_yapikredi(text):
    import re
    records = []
    try:
        lines = text.splitlines()
        for i in range(len(lines) - 3):
            line = lines[i].strip()
            if re.match(r'\d{2}/\d{2}/\d{4}', line):
                # 1. satır: tarih + açıklama birleşik
                match = re.match(r'(\d{2}/\d{2}/\d{4})(.*)', line)
                if not match:
                    continue
                date, desc_part1 = match.groups()
                desc_part2 = lines[i + 1].strip() if i + 1 < len(lines) else ""
                card = lines[i + 2].strip() if i + 2 < len(lines) else ""
                amount_line = lines[i + 3].strip() if i + 3 < len(lines) else ""
                # Açıklama iki parçadan oluşuyor
                description = f"{desc_part1.strip()} {desc_part2.strip()}"
                # Tutar: virgülü noktaya çevir
                amount_match = re.search(r'([\d.]+,\d{2})\s*TL', amount_line)
                if amount_match:
                    amount_text = amount_match.group(1)
                    amount = float(amount_text.replace('.', '').replace(',', '.'))
                    records.append([
                        "Yapı Kredi",  # Banka
                        card,  # Kart No
                        date,  # İşlem Tarihi
                        description,  # Açıklama
                        amount,  # Tutar (TL)
                        "",  # Taksit
                        "TL",  # Para Birimi
                        ""  # Puan
                    ])
    except Exception as e:
        print("❌ Hata [parse_yapikredi]:", e)
        traceback.print_exc()
    return records