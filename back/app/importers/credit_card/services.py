
# app/importer/services.py
import pandas as pd
from .parsers.main_parser import process_pdf_statement

from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr


@service_logger
def parse_file_to_dataframe(file_stream, file_type: str, bank_name: str | None = None) -> pd.DataFrame:
    """
    Yüklenen PDF/Excel dosyasını DataFrame'e çevirir.
    4xx: AppError (kısa ve net mesajlar)
    5xx: raise (global handler stack'i yazar)
    """
    file_type = (file_type or "").strip().lower()

    if file_type not in {"pdf", "excel"}:
        raise AppError("Unsupported file type. Use 'pdf' or 'excel'.", 400, code="INVALID_TYPE",
                       details={"given": file_type})

    if file_type == "pdf":
        if not bank_name:
            raise AppError("bank_name is required for PDF.", 400, code="MISSING_BANK")
        dinfo("import.parse.start", kind="pdf", bank_name=bank_name)

        try:
            df = process_pdf_statement(file_stream, bank_name)
        except AppError:
            # parser alt katmanda zaten AppError ürettiyse aynen ilet
            raise
        except ValueError as ve:
            # parser validasyon hatası → 400
            dwarn("import.parse.pdf.validation", reason=str(ve), bank_name=bank_name)
            raise AppError(str(ve), 400, code="PDF_PARSE_VALIDATION")
        except Exception as e:
            # beklenmeyen → 5xx
            derr("import.parse.pdf.unhandled", err=e, bank_name=bank_name)
            raise

    else:  # excel
        dinfo("import.parse.start", kind="excel")
        try:
            df = pd.read_excel(file_stream)
        except ValueError as ve:
            # pandas'ın format/okuma validasyonları → 400
            dwarn("import.parse.excel.validation", reason=str(ve))
            raise AppError("Invalid Excel content or format.", 400, code="EXCEL_PARSE_VALIDATION")
        except Exception as e:
            derr("import.parse.excel.unhandled", err=e)
            raise

    # --- Kolon standardizasyonu (sadece mevcut olanları adlandır) ---
    column_mapping = {
        "İşlem Tarihi": "İşlem Tarihi",
        "Açıklama": "Açıklama",
        "Tutar (TL)": "Tutar (TL)",
        "Kart No": "Kart No",
        "Taksit Bilgisi": "Taksit Bilgisi",
        "Para Birimi": "Para Birimi",
        "Puan": "Puan",
    }
    present = {k: v for k, v in column_mapping.items() if k in df.columns}
    if present:
        df.rename(columns=present, inplace=True)

    # --- Basit sağlık kontrolleri + kısa domain logları ---
    rows = int(len(df))
    cols_preview = list(df.columns)[:10]  # log'u şişirmeden fikir ver
    if rows == 0:
        dwarn("import.parse.empty", rows=rows, columns=cols_preview)
    else:
        dinfo("import.parse.done", rows=rows, columns=cols_preview)

    return df
