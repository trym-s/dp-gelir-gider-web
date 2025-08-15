import re

def parse_ziraat(text):
        records = []
        try:
            lines = text.splitlines()
            current_card = ""

            # Kart numarası yakala
            for line in lines:
                if "KART NO" in line or re.match(r'^\d{4}-####-####-\d{4}', line):
                    match = re.search(r'(\d{4}-####-####-\d{4})', line)
                    if match:
                        current_card = match.group(1)
                        break

            date_pattern = r'^\d{2}\.\d{2}\.\d{4}$'
            amount_pattern = r'^\d{1,3}(\.\d{3})*,\d{2}$|^\d+,\d{2}$'
            i = 0

            while i < len(lines) - 1:
                line = lines[i].strip()
                if re.match(date_pattern, line):
                    date = line.replace('.', '/')
                    desc = lines[i + 1].strip()

                    # TL tutar satırını bul
                    j = i + 2
                    while j < len(lines):
                        amt_line = lines[j].strip()
                        if re.match(amount_pattern, amt_line) and '+' not in amt_line:
                            try:
                                amount = float(amt_line.replace('.', '').replace(',', '.'))
                                records.append([
                                    "Ziraat Bankası",
                                    current_card,
                                    date,
                                    desc,
                                    amount,
                                    "",  # Taksit bilgisi yok
                                    "TL",
                                    ""  # Puan bilgisi yok
                                ])
                                break
                            except Exception as e:
                                print(f"❌ Tutar dönüşüm hatası: '{amt_line}' → {e}")
                        j += 1
                    i = j + 1
                else:
                    i += 1

        except Exception as e:
            print("❌ parse_ziraat genel hata:", e)
            import traceback
            traceback.print_exc()

        print(f"✅ Toplam {len(records)} satır yakalandı.")
        return records

