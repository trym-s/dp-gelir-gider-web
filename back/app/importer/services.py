import pandas as pd
from ..parser.credit_card_statements.main_parser import process_pdf_statement
import logging

def parse_file_to_dataframe(file_stream, file_type: str, bank_name: str = None) -> pd.DataFrame:
    """
    Verilen dosya akışını ve türünü alarak bir Pandas DataFrame'e dönüştürür.

    :param file_stream: Dosyanın stream'i (request.files['file'].stream).
    :param file_type: 'pdf' veya 'excel'.
    :param bank_name: file_type 'pdf' ise zorunludur.
    :return: İşlenmiş veriyi içeren bir Pandas DataFrame.
    :raises ValueError: Geçersiz veya eksik parametreler için.
    """
    if file_type == 'pdf':
        if not bank_name:
            raise ValueError("PDF dosyaları için banka adı zorunludur.")
        logging.info(f"PDF Parser çağrılıyor: Banka - {bank_name}")
        df = process_pdf_statement(file_stream, bank_name)
    elif file_type == 'excel':
        logging.info("Excel Parser çağrılıyor.")
        df = pd.read_excel(file_stream)
    else:
        raise ValueError(f"Desteklenmeyen dosya türü: {file_type}")

    # Sütun adlarını frontend'in beklediği standart formata getirelim
    # Bu, parser'lardan farklı isimler gelse bile tutarlılık sağlar.
    column_mapping = {
        "İşlem Tarihi": "İşlem Tarihi",
        "Açıklama": "Açıklama",
        "Tutar (TL)": "Tutar (TL)",
        "Kart No": "Kart No",
        "Taksit Bilgisi": "Taksit Bilgisi",
        "Para Birimi": "Para Birimi",
        "Puan": "Puan"
    }
    # Sadece var olan sütunları yeniden adlandır
    df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns}, inplace=True)
    
    return df