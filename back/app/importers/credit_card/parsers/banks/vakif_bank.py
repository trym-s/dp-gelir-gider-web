import re
from ..utils import parse_amount

def parse_vakifbank(text):
    records = []
    try:
        lines = text.splitlines()
        date_pattern = r'^\d{2}[./]\d{2}[./]\d{4}$'
        # 💳 Kart numarasını yakala
        card_match = re.search(r'(\d{4}\*{4,}\d{4})', text)
        card_number = card_match.group(1) if card_match else ""
        i = 0
        while i < len(lines) - 2:
            date_line = lines[i].strip().replace('\xa0', '')
            desc_line = lines[i + 1].strip()
            amount_line = lines[i + 2].strip()
            if re.match(date_pattern, date_line) and re.search(r'\d', amount_line):
                date = date_line.replace('.', '/')
                description = desc_line
                raw_amount = amount_line.split()[0].strip().replace('\xa0', '')
                amount = parse_amount(raw_amount)
                if amount is None:
                    i += 1
                    continue
                taksit = ""
                if i + 3 < len(lines):
                    taksit_line = lines[i + 3].strip()
                    if re.match(r'\d+x[\d.,]+', taksit_line):
                        taksit = taksit_line
                        i += 1
                # WORLDPUAN veya tek sayı satırlarını atla
                if len(description.split()) < 2 and len(description) < 10 and not re.search(r'[A-Za-z]',
                                                                                            description):
                    i += 1
                    continue
                records.append([
                    "VakıfBank",
                    card_number,
                    date,
                    description,
                    amount,
                    taksit,
                    "TL",
                    ""
                ])
                i += 3
            else:
                i += 1
    except Exception as e:
        print("❌ parse_vakifbank genel hata:", e)
        import traceback
        traceback.print_exc()
    print(f"✅ Toplam {len(records)} satır yakalandı.")
    return records