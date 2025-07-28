import tkinter as tk
from tkinter import filedialog, messagebox
import pandas as pd
import fitz  # PyMuPDF
import re
import traceback


def launch_app():
    def parse_amount(raw):
        try:
            raw = raw.replace(' ', '').replace('\xa0', '')
            if raw.startswith('+'):
                sign = 1
                raw = raw[1:]
            elif raw.startswith('-'):
                sign = -1
                raw = raw[1:]
            else:
                sign = 1

            if raw.count(',') == 1 and raw.count('.') == 1:
                # en yaygın durum: 1,234.56 → 1234.56
                raw = raw.replace(',', '')
            elif raw.count('.') > 1:
                # 1.234.567,89 → 1234567.89
                raw = raw.replace('.', '').replace(',', '.')
            elif raw.count(',') > 1:
                # 1,234,567.89 → 1234567.89
                raw = raw.replace(',', '')

            elif ',' in raw:
                # 1234,56 → 1234.56
                raw = raw.replace(',', '.')
            return round(float(raw) * sign, 2)
        except Exception as e:
            print(f"❌ Tutar dönüşüm hatası: '{raw}' → {e}")
            return None

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

    def select_file():
        try:
            file_path.set(filedialog.askopenfilename(filetypes=[("PDF Files", "*.pdf")]))
        except Exception as e:
            print("❌ Hata [select_file]:", e)
            traceback.print_exc()

    def convert_pdf_to_excel():
        try:
            pdf_path = file_path.get()
            selected_bank = bank_var.get()

            if not pdf_path or not selected_bank:
                messagebox.showerror("Hata", "Lütfen bir dosya seçin ve banka adını belirtin.")
                return

            # PDF'den metni oku
            doc = fitz.open(pdf_path)
            text = ""
            for page_num, page in enumerate(doc):
                page_text = page.get_text()
                print(f"\n--- Sayfa {page_num + 1} ---\n{page_text}")
                text += page_text + "\n"

            df = process_text_to_dataframe(text, selected_bank)

            if df.empty:
                messagebox.showwarning("Uyarı", "Veri bulunamadı veya eşleşme sağlanamadı.")
                return

            output_excel = "HesapOzeti_" + selected_bank.replace(" ", "_") + ".xlsx"
            df.to_excel(output_excel, index=False)
            messagebox.showinfo("Başarılı", f"Excel dosyası oluşturuldu: {output_excel}")
        except Exception as e:
            print("❌ Hata [convert_pdf_to_excel]:", e)
            traceback.print_exc()
            messagebox.showerror("Hata", f"İşlem sırasında hata oluştu:\n{str(e)}")

    def process_text_to_dataframe(text, bank):
        columns = ["Banka", "Kart No", "İşlem Tarihi", "Açıklama", "Tutar (TL)", "Taksit Bilgisi", "Para Birimi", "Puan"]
        try:
            if bank == "Yapı Kredi":
                return pd.DataFrame(parse_yapikredi(text), columns=columns)
            elif bank == "TEB":
                return pd.DataFrame(parse_teb(text), columns=columns)
            elif bank == "İş Bankası":
                return pd.DataFrame(parse_isbank(text), columns=columns)
            elif bank == "VakıfBank":
                return pd.DataFrame(parse_vakifbank(text),columns=columns)
            elif bank == "ZiraatBank":
                return pd.DataFrame(parse_ziraat(text), columns=columns)
            else:
                return pd.DataFrame(columns=columns)
        except Exception as e:
            print("❌ Hata [process_text_to_dataframe]:", e)
            traceback.print_exc()
            return pd.DataFrame(columns=columns)

    # GUI Arayüzü
    try:
        root = tk.Tk()
        root.title("Banka Hesap Özeti Dönüştürücü")

        file_path = tk.StringVar()
        bank_var = tk.StringVar()

        tk.Label(root, text="PDF Dosyası Seç:").grid(row=0, column=0, padx=10, pady=10)
        tk.Entry(root, textvariable=file_path, width=50).grid(row=0, column=1)
        tk.Button(root, text="Gözat", command=select_file).grid(row=0, column=2)

        tk.Label(root, text="Banka Seç:").grid(row=1, column=0, padx=10, pady=10)
        tk.OptionMenu(root, bank_var, "Yapı Kredi", "TEB", "İş Bankası", "VakıfBank","ZiraatBank").grid(row=1, column=1)

        tk.Button(root, text="PDF'den Excel Oluştur", command=convert_pdf_to_excel, bg="green", fg="white").grid(
            row=2, column=1, pady=20)

        root.mainloop()
    except Exception as e:
        print("❌ Hata [GUI Başlatma]:", e)
        traceback.print_exc()


if __name__ == "__main__":
    launch_app()


