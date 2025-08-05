# app/income_transaction_pdf/routes.py

import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for
from werkzeug.utils import secure_filename
from app.income.models import IncomeTransactionPDF, Income
from app import db
from flask_login import login_required

# YENİ BLUEPRINT
income_pdf_bp = Blueprint('income_pdf_api', __name__, url_prefix='/api/income-pdfs')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
UPLOAD_FOLDER_REL = os.path.join('uploads', 'income_pdfs') 

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def pdf_to_dict(pdf_obj):
    """Bir PDF nesnesini, güvenli bir şekilde sözlüğe çevirir."""
    return {
        'id': pdf_obj.id,
        'income_id': pdf_obj.income_id,
        'original_filename': pdf_obj.original_filename,
        'url': url_for('income_pdf_api.serve_pdf', filename=pdf_obj.saved_filename, _external=True),
        'uploaded_at': pdf_obj.uploaded_at.isoformat()
    }

@income_pdf_bp.route('/income/<int:income_id>', methods=['GET'])
def get_pdfs_for_income(income_id):
    """Belirli bir gelire ait tüm PDF'leri listeler."""
    pdfs = IncomeTransactionPDF.query.filter_by(income_id=income_id).order_by(IncomeTransactionPDF.uploaded_at.desc()).all()
    return jsonify([pdf_to_dict(p) for p in pdfs])

@income_pdf_bp.route('/income/<int:income_id>', methods=['POST'])
def upload_pdf_for_income(income_id):
    """Belirli bir gelire yeni bir PDF yükler."""
    if 'file' not in request.files:
        return jsonify({"error": "Dosya bulunamadı"}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Geçersiz dosya türü"}), 400

    if not Income.query.get(income_id):
        return jsonify({"error": "Gelir kaydı bulunamadı"}), 404

    try:
        original_filename = secure_filename(file.filename)
        extension = original_filename.rsplit('.', 1)[1].lower()
        saved_filename = f"{uuid.uuid4().hex}.{extension}"
        
        upload_folder_abs = os.path.join(current_app.root_path, UPLOAD_FOLDER_REL)
        os.makedirs(upload_folder_abs, exist_ok=True)
        
        file.save(os.path.join(upload_folder_abs, saved_filename))

        new_pdf = IncomeTransactionPDF(
            income_id=income_id, 
            original_filename=original_filename,
            saved_filename=saved_filename, 
            file_path=saved_filename
        )
        db.session.add(new_pdf)
        db.session.commit()
        
        return jsonify(pdf_to_dict(new_pdf)), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Gelir PDF Yükleme Hatası: {e}")
        return jsonify({"error": "Sunucu hatası nedeniyle dosya yüklenemedi."}), 500

@income_pdf_bp.route('/<int:pdf_id>', methods=['DELETE'])
def delete_pdf(pdf_id):
    """Bir PDF dosyasını hem diskten hem veritabanından siler."""
    try:
        pdf_to_delete = IncomeTransactionPDF.query.get_or_404(pdf_id)
        
        upload_folder_abs = os.path.join(current_app.root_path, UPLOAD_FOLDER_REL)
        file_path = os.path.join(upload_folder_abs, pdf_to_delete.saved_filename)
        
        if os.path.exists(file_path):
            os.remove(file_path)

        db.session.delete(pdf_to_delete)
        db.session.commit()
        
        return jsonify({"message": "Dosya başarıyla silindi."}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Gelir PDF Silme Hatası: {e}")
        return jsonify({"error": "Dosya silinirken bir hata oluştu."}), 500

@income_pdf_bp.route('/view/<filename>', methods=['GET'])
def serve_pdf(filename):
    """Kaydedilmiş dosyaları sunar."""
    upload_folder_abs = os.path.join(current_app.root_path, UPLOAD_FOLDER_REL)
    return send_from_directory(upload_folder_abs, filename)