# app/income_transaction_pdf/routes.py

import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for
from werkzeug.utils import secure_filename

from app import db
from app.errors import AppError
from app.logging_utils import route_logger, dinfo_sampled, dinfo, dwarn
from app.income.models import IncomeTransactionPDF, Income

income_pdf_bp = Blueprint('income_pdf_api', __name__, url_prefix='/api/income-pdfs')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
UPLOAD_FOLDER_REL = os.path.join('uploads', 'income_pdfs')  # app root altında

# ------------------------ helpers ------------------------

def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _upload_dir_abs() -> str:
    return os.path.join(current_app.root_path, UPLOAD_FOLDER_REL)

def _ensure_upload_dir():
    path = _upload_dir_abs()
    try:
        os.makedirs(path, exist_ok=True)
    except OSError as e:
        # Bilinen bir I/O problemi: 500 ama mesajı kullanıcı-dostu
        raise AppError("Upload klasörü oluşturulamadı.", 500) from e

def _pdf_to_dict(pdf_obj: IncomeTransactionPDF) -> dict:
    return {
        'id': pdf_obj.id,
        'income_id': pdf_obj.income_id,
        'original_filename': pdf_obj.original_filename,
        'url': url_for('income_pdf_api.serve_pdf', filename=pdf_obj.saved_filename, _external=True),
        'uploaded_at': pdf_obj.uploaded_at.isoformat()
    }

# ------------------------ routes ------------------------

@income_pdf_bp.route('/income/<int:income_id>', methods=['GET'], strict_slashes=False)
@route_logger
def get_pdfs_for_income(income_id: int):
    """Belirli bir gelire ait tüm PDF/ekleri listeler."""
    pdfs = (IncomeTransactionPDF.query
            .filter_by(income_id=income_id)
            .order_by(IncomeTransactionPDF.uploaded_at.desc())
            .all())
    dinfo_sampled("income_pdf.list", income_id=income_id, count=len(pdfs))
    return jsonify([_pdf_to_dict(p) for p in pdfs]), 200


@income_pdf_bp.route('/income/<int:income_id>', methods=['POST'], strict_slashes=False)
@route_logger
def upload_pdf_for_income(income_id: int):
    """Belirli bir gelire yeni bir PDF/ek yükler."""
    if 'file' not in request.files:
        raise AppError("'file' alanı zorunludur.", 400)

    file = request.files['file']
    if not file or file.filename == '':
        raise AppError("Geçerli bir dosya seçilmedi.", 400)

    if not _allowed_file(file.filename):
        raise AppError("Desteklenmeyen dosya türü. İzin verilenler: pdf, jpg, jpeg, png.", 400)

    income = Income.query.get(income_id)
    if not income:
        raise AppError("Gelir kaydı bulunamadı.", 404)

    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit('.', 1)[1].lower()
    saved_filename = f"{uuid.uuid4().hex}.{extension}"

    _ensure_upload_dir()
    abs_dir = _upload_dir_abs()
    abs_path = os.path.join(abs_dir, saved_filename)

    try:
        file.save(abs_path)
    except OSError as e:
        # Dosya yazma hatası: anlamlı 500
        raise AppError("Dosya kaydedilemedi.", 500) from e

    try:
        new_pdf = IncomeTransactionPDF(
            income_id=income_id,
            original_filename=original_filename,
            saved_filename=saved_filename,
            file_path=saved_filename  # sadece dosya adı tutuluyor
        )
        db.session.add(new_pdf)
        db.session.commit()
        dinfo("income_pdf.uploaded", income_id=income_id, pdf_id=new_pdf.id, ext=extension)
        return jsonify(_pdf_to_dict(new_pdf)), 201
    except Exception as e:
        db.session.rollback()
        # DB seviyesinde beklenmedik bir durum: global handler 5xx ve stack’i yazar
        raise


@income_pdf_bp.route('/<int:pdf_id>', methods=['DELETE'], strict_slashes=False)
@route_logger
def delete_pdf(pdf_id: int):
    """PDF/ek dosyasını hem diskten hem veritabanından siler."""
    pdf_obj = IncomeTransactionPDF.query.get(pdf_id)
    if not pdf_obj:
        raise AppError("PDF bulunamadı.", 404)

    abs_dir = _upload_dir_abs()
    abs_path = os.path.join(abs_dir, pdf_obj.saved_filename)

    # Dosya yoksa sorun etmeyelim; sadece DB kaydını sileriz
    if os.path.exists(abs_path):
        try:
            os.remove(abs_path)
        except OSError as e:
            # Dosya silinemediyse yine de anlamlı bir mesaj verelim
            raise AppError("Dosya sisteminden silme başarısız.", 500) from e

    try:
        db.session.delete(pdf_obj)
        db.session.commit()
        dinfo("income_pdf.deleted", pdf_id=pdf_id)
        return jsonify({"message": "Dosya başarıyla silindi."}), 200
    except Exception:
        db.session.rollback()
        raise


@income_pdf_bp.route('/view/<filename>', methods=['GET'], strict_slashes=False)
@route_logger
def serve_pdf(filename: str):
    """Kaydedilmiş dosyayı sunar."""
    abs_dir = _upload_dir_abs()
    file_path = os.path.join(abs_dir, filename)
    if not os.path.exists(file_path):
        raise AppError("Dosya bulunamadı.", 404)
    # send_from_directory kendi 304/206 gibi cevaplarını da yönetir
    return send_from_directory(abs_dir, filename)

