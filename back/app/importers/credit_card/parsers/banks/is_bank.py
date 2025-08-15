import re
def parse_isbank(text):
    records = []
    try:
        lines = text.splitlines()
        date_pattern = r'^\d{2}/\d{2}/\d{4}$'
        amount_pattern = r'^[-+]?\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$'
    
        # 💳 Kart numarasını bul
        card_match = re.search(r'(\d{4}\*{4,}\d{4})', text)
        card_number = card_match.group(1) if card_match else ""
    
        i = 0
        while i < len(lines) - 4:
            line = lines[i].strip()
            if re.match(date_pattern, line):
                try:
                    date = line
                    ref = lines[i + 1].strip()
                    description_lines = []
                
                    # açıklama genellikle 1–2 satır
                    j = i + 2
                    while j < len(lines):
                        dline = lines[j].strip()
                        if re.match(amount_pattern, dline):
                            break
                        description_lines.append(dline)
                        j += 1
                    
                    description = " ".join(description_lines).strip()
                    amount_line = lines[j].strip()
                    amount = float(amount_line.replace('.', '').replace(',', '.'))
                
                    # son satırda puan varsa onu al
                    puan = ""
                    if j + 1 < len(lines):
                        puan_line = lines[j + 1].strip()
                        puan_match = re.match(r'^\d+,\d{2}$|^\d+,\d$', puan_line)
                        if puan_match:
                            puan = puan_line
                        
                    records.append([
                        "İş Bankası",
                        card_number,
                        date,
                        description,
                        amount,
                        "",  # taksit bilgisi istenirse eklenebilir
                        "TL",
                        puan
                    ])
                    i = j + 2
                except Exception as e:
                    print(f"❌ Hata bir satırı işlerken: {e}")
                    i += 1
            else:
                i += 1
    except Exception as e:
        print("❌ Genel hata [parse_isbank]:", e)
        import traceback
        traceback.print_exc()
    return records
