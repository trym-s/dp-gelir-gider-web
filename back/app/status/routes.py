# app/status/routes.py

from flask import Blueprint, request, jsonify
from . import services as status_services
from .schemas import status_history_schema # Doğrulama için

## YENİ: Merkezi status yönetimi için Blueprint
status_bp = Blueprint('status', __name__, url_prefix='/api/status-history')

@status_bp.route('/', methods=['GET'])
def get_history():
    """
    Herhangi bir varlığın durum geçmişini listeler.
    Query parametreleri olarak ?subject_type=account&subject_id=5 gibi kullanılır.
    """
    subject_type = request.args.get('subject_type')
    subject_id = request.args.get('subject_id')

    if not all([subject_type, subject_id]):
        return jsonify({"message": "subject_type ve subject_id query parametreleri zorunludur."}), 400

    try:
        history = status_services.get_status_history_for_subject(subject_type, int(subject_id))
        return jsonify(history), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        return jsonify({"message": f"Geçmiş alınırken bir hata oluştu: {e}"}), 500

@status_bp.route('/', methods=['POST'])
def create_status():
    """Herhangi bir varlık için yeni bir durum kaydı oluşturur."""
    data = request.get_json()
    errors = status_history_schema.validate(data)
    if errors:
        return jsonify({"errors": errors}), 400
        
    try:
        new_status = status_services.save_new_status(data)
        return jsonify(new_status), 201
    except ValueError as e:
        return jsonify({"message": str(e)}), 404 # Varlık bulunamadı hatası
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Durum kaydı oluşturulurken bir hata oluştu: {e}"}), 500