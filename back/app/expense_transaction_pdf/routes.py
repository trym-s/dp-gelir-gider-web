import os, uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for
from werkzeug.utils import secure_filename

from app import db
from app.errors import AppError
from app.logging_utils import route_logger, dinfo, dwarn, derr
from app.expense.models import ExpenseTransactionPDF, Expense

pdf_bp = Blueprint("pdf_api", __name__, url_prefix="/api/expense-pdfs")

# ---- Config ---------------------------------------------------------------
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}

def _upload_root() -> str:
    # Config üzerinden kök upload klasörü; yoksa proje kökünde uploads/
    return current_app.config.get("UPLOAD_ROOT", os.path.join(current_app.root_path, "uploads"))

def _max_upload_bytes() -> int:
    # Varsayılan 15MB (nginx/proxy sınırlarıyla uyumlu tut)
    mb = int(current_app.config.get("MAX_UPLOAD_MB", 15))
    return mb * 1024 * 1024

def _save_dir() -> str:
    return os.path.join(_upload_root(), "expense_pdfs")

def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def _build_url(saved_filename: str) -> str:
    return url_for("pdf_api.serve_pdf", filename=saved_filename, _external=True)

def _pdf_to_dict(pdf_obj: ExpenseTransactionPDF) -> dict:
    return {
        "id": pdf_obj.id,
        "expense_id": pdf_obj.expense_id,
        "original_filename": pdf_obj.original_filename,
        "url": _build_url(pdf_obj.saved_filename),
        "uploaded_at": pdf_obj.uploaded_at.isoformat() if isinstance(pdf_obj.uploaded_at, datetime) else str(pdf_obj.uploaded_at),
    }

# ---- Routes ---------------------------------------------------------------

@pdf_bp.route("/expense/<int:expense_id>", methods=["GET"])
@route_logger
def get_pdfs_for_expense(expense_id: int):
    """Belirli bir gidere ait tüm PDF/ekleri listeler."""
    pdfs = (
        ExpenseTransactionPDF.query
        .filter_by(expense_id=expense_id)
        .order_by(ExpenseTransactionPDF.uploaded_at.desc())
        .all()
    )
    dinfo("expense_pdf.list", expense_id=expense_id, count=len(pdfs))
    return jsonify([_pdf_to_dict(p) for p in pdfs]), 200


@pdf_bp.route("/expense/<int:expense_id>", methods=["POST"])
@route_logger
def upload_pdf_for_expense(expense_id: int):
    """Belirli bir gidere yeni bir dosya (pdf/jpg/png) yükler."""
    # 1) Gider var mı?
    exp = Expense.query.get(expense_id)
    if not exp:
        raise AppError("Expense not found.", 404)

    # 2) Content-Length koruması
    clen = request.content_length or 0
    if clen > _max_upload_bytes():
        raise AppError(f"File too large. Limit is {int(_max_upload_bytes()/1024/1024)}MB.", 413)

    # 3) Dosya var mı ve türü geçerli mi?
    if "file" not in request.files:
        raise AppError("No file part in request (field: 'file').", 400)

    file = request.files["file"]
    if not file or not file.filename:
        raise AppError("No selected file.", 400)

    original_filename = secure_filename(file.filename)
    if not _allowed_file(original_filename):
        raise AppError(f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}", 400)

    # 4) Kaydet
    saved_filename = None
    try:
        ext = original_filename.rsplit(".", 1)[1].lower()
        saved_filename = f"{uuid.uuid4().hex}.{ext}"

        os.makedirs(_save_dir(), exist_ok=True)
        abs_path = os.path.join(_save_dir(), saved_filename)
        file.save(abs_path)

        new_pdf = ExpenseTransactionPDF(
            expense_id=expense_id,
            original_filename=original_filename,
            saved_filename=saved_filename,
            file_path=saved_filename,  # sadece dosya adını saklıyoruz
        )
        db.session.add(new_pdf)
        db.session.commit()

        dinfo(
            "expense_pdf.uploaded",
            expense_id=expense_id,
            pdf_id=new_pdf.id,
            original=original_filename,
            saved=saved_filename,
            size_bytes=clen,
        )
        return jsonify(_pdf_to_dict(new_pdf)), 201

    except AppError:
        # 4xx ise dosya silmeye de çalış
        db.session.rollback()
        if saved_filename:
            try:
                os.remove(os.path.join(_save_dir(), saved_filename))
            except Exception:
                pass
        raise
    except Exception as e:
        # 5xx – dosyayı da temizlemeye çalış
        db.session.rollback()
        if saved_filename:
            try:
                os.remove(os.path.join(_save_dir(), saved_filename))
            except Exception:
                pass
        derr("expense_pdf.upload_failed", err=e, expense_id=expense_id, original=original_filename)
        # Global error handler zaten stack’i yazar; burada AppError(500) sarmıyoruz.
        raise


@pdf_bp.route("/<int:pdf_id>", methods=["DELETE"])
@route_logger
def delete_pdf(pdf_id: int):
    """Bir dosyayı hem diskten hem DB’den siler."""
    try:
        pdf_obj = ExpenseTransactionPDF.query.get_or_404(pdf_id)

        abs_path = os.path.join(_save_dir(), pdf_obj.saved_filename)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except Exception as e:
                # Diskten silinemese bile veritabanından silmeye devam edelim; log bırak.
                dwarn("expense_pdf.remove_file_failed", pdf_id=pdf_id, path=abs_path, reason=str(e))

        db.session.delete(pdf_obj)
        db.session.commit()
        dinfo("expense_pdf.deleted", pdf_id=pdf_id, expense_id=pdf_obj.expense_id)
        return jsonify({"message": "Dosya başarıyla silindi."}), 200

    except Exception as e:
        db.session.rollback()
        derr("expense_pdf.delete_failed", err=e, pdf_id=pdf_id)
        raise  # 5xx’i global handler ele alsın


@pdf_bp.route("/view/<filename>", methods=["GET"])
@route_logger
def serve_pdf(filename: str):
    """Kaydedilmiş dosyayı servis eder."""
    # Path traversal koruması: sadece save_dir altından servis et
    return send_from_directory(_save_dir(), filename, as_attachment=False)

