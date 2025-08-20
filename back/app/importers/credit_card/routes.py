# app/importer/routes.py
from flask import Blueprint, request, jsonify
from app.errors import AppError
from app.logging_utils import route_logger, dinfo, dwarn, derr

from . import services  # parse_file_to_dataframe

credit_card_importer_bp = Blueprint('credit_card_importer_api', __name__, url_prefix='/api/importer')

@credit_card_importer_bp.route('/file-parser', methods=['POST'])
@route_logger
def parse_uploaded_file():
    """
    Yüklenen Excel/PDF dosyasını ayrıştırır, onay ekranı için JSON döner.
    4xx -> AppError; 5xx -> raise (global handler loglar ve standart hata cevabı döner).
    """
    # ---- Temel validasyonlar (4xx) ----
    if 'file' not in request.files:
        raise AppError("Dosya bulunamadı. 'file' alanı zorunludur.", 400, code="MISSING_FILE")

    file = request.files['file']
    file_type = (request.form.get('type') or "").strip().lower()
    bank_name = (request.form.get('bank_name') or "").strip() or None

    if not file or not file.filename:
        raise AppError("Geçerli bir dosya seçilmedi.", 400, code="EMPTY_FILE")

    if file_type not in {"pdf", "excel"}:
        raise AppError("Geçersiz 'type'. Desteklenen değerler: pdf | excel", 400, code="INVALID_TYPE",
                       details={"given": file_type})

    # ---- Ayrıştırma ----
    try:
        df = services.parse_file_to_dataframe(file.stream, file_type, bank_name)
        records_json = df.to_dict(orient='records')
        # küçük bir domain izi (başarılı ayrıştırma) — POST olduğu için sampled değil
        dinfo("import.parse.ok",
              file_name=file.filename,
              file_type=file_type,
              bank_name=bank_name,
              rows=len(records_json))
        return jsonify(records_json), 200

    except ValueError as ve:
        # Servis “beklenen” hata üretmişse → 400
        # (ör: desteklenmeyen banka formatı, yanlış sayfa, vs.)
        dwarn("import.parse.bad_request",
              reason=str(ve),
              file_name=file.filename, file_type=file_type, bank_name=bank_name)
        raise AppError(str(ve), 400, code="PARSE_VALIDATION", details={"reason": str(ve)})

    except AppError:
        # Servis zaten AppError fırlattıysa olduğu gibi bırak
        raise

    except Exception as e:
        # Beklenmeyen hata → 5xx. Domain'e korelasyon için not düş; global handler stack trace'i yazar.
        derr("import.parse.unhandled",
             err=e,
             file_name=file.filename, file_type=file_type, bank_name=bank_name)
        raise  # global error handler standardize JSON + request_id dönecek

