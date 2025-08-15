import re

def parse_teb(text):
    records = []
    try:
        lines = text.splitlines()
        date_pattern = r'^\d{2}/\d{2}/\d{4}$'
        i = 0
        while i < len(lines) - 4:
            line = lines[i].strip()
            if re.match(date_pattern, line):
                date = line
                card = lines[i + 1].strip()
                description = lines[i + 2].strip()
                amount_line = lines[i + 3].strip()
                currency_line = lines[i + 4].strip()
                if "TL" in currency_line:
                    try:
                        amount = float(amount_line.replace('.', '').replace(',', '.'))
                        records.append([
                            "TEB",
                            card,
                            date,
                            description,
                            amount,
                            "",
                            "TL",
                            ""
                        ])
                    except Exception as e:
                        print(f"❌ Tutar dönüşüm hatası: {amount_line} → {e}")
                i += 5  # bir sonraki bloğa geç
            else:
                i += 1  # satır tarih değilse atla
    except Exception as e:
        print("❌ Hata [parse_teb]:", e)
        import traceback
        traceback.print_exc()
    return records

