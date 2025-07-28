import fitz  # PyMuPDF
import pandas as pd
import logging

# Tüm banka parser'larımızı import ediyoruz
from .banks.is_bank import parse_isbank
from .banks.teb_bank import parse_teb
from .banks.vakif_bank import parse_vakifbank
from .banks.ziraat_bank import parse_ziraat
from .banks.yapikredi_bank import parse_yapikredi

# Hangi banka adının hangi fonksiyonu çalıştıracağını belirleyen "fabrika"
PARSERS = {
    "İş Bankası": parse_isbank,
    "TEB": parse_teb,
    "VakıfBank": parse_vakifbank,
    "Ziraat Bankası": parse_ziraat,
    "Yapı Kredi": parse_yapikredi,
}

def process_pdf_statement(pdf_stream, bank_name: str) -> pd.DataFrame:
    """
    Bir PDF dosya akışını ve banka adını alarak, ilgili ayrıştırıcıyı çalıştırır
    ve sonucu bir Pandas DataFrame olarak döndürür.

    :param pdf_stream: PDF dosyasının binary stream'i (örn: file.stream).
    :param bank_name: Frontend'den gelen banka adı.
    :return: Standartlaştırılmış sütunlara sahip bir Pandas DataFrame.
    :raises ValueError: Desteklenmeyen bir banka adı gelirse.
    """
    logging.info(f"'{bank_name}' için PDF ayrıştırma işlemi başlatıldı.")
    
    parser_func = PARSERS.get(bank_name)
    if not parser_func:
        logging.error(f"Desteklenmeyen banka adı: {bank_name}")
        raise ValueError(f"'{bank_name}' için bir ayrıştırıcı bulunamadı.")

    # --- DÜZELTME BURADA ---
    # 1. Flask'in stream nesnesini ham byte'lara oku.
    pdf_bytes = pdf_stream.read()
    
    # 2. PyMuPDF'e stream yerine bu byte'ları ver.
    text = ""
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    # --- DÜZELTME SONU ---
    
    # İlgili banka fonksiyonunu çalıştır
    records = parser_func(text)
    
    # Sonucu standart bir DataFrame'e dönüştür
    columns = ["Banka", "Kart No", "İşlem Tarihi", "Açıklama", "Tutar (TL)", "Taksit Bilgisi", "Para Birimi", "Puan"]
    df = pd.DataFrame(records, columns=columns)
    
    logging.info(f"'{bank_name}' için {len(df)} adet işlem başarıyla ayrıştırıldı.")
    return df