
from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from .services import PaymentService
from .schemas import PaymentSchema, PaymentUpdateSchema
from ..errors import AppError
from app.logging_utils import route_logger

# URL prefix'i ile tüm bu blueprint'teki endpoint'lerin /api ile başlamasını sağlıyoruz.
payment_bp = Blueprint('payments_api', __name__, url_prefix='/api')

# Servis ve şemaları başlat
payment_service = PaymentService()
payment_schema = PaymentSchema()
payments_schema = PaymentSchema(many=True)  # Liste halinde göstermek için
payment_update_schema = PaymentUpdateSchema()


# app/expense/routes.py (POST)
@payment_bp.route('/expenses/<int:expense_id>/payments', methods=['POST'])
@route_logger
def create_payment_for_expense(expense_id):
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400

    try:
        data = payment_schema.load({**json_data, "expense_id": expense_id})
        data['expense_id'] = expense_id

        new_payment = payment_service.create(expense_id, data)
        return jsonify(payment_schema.dump(new_payment)), 201
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

# Tüm ödemeleri filtreli/sıralı/sayfalı getirmek için
@payment_bp.route('/payments', methods=['GET'])
def get_all_payments():
    """Tüm ödemeleri listeler. Filtre, sıralama ve sayfalama destekler."""
    try:
        # URL query parametrelerini (örn: ?expense_id=5&page=1) al
        filters = request.args.to_dict()

        # Sayfa ve limit değerlerini integer'a çevir
        page = int(filters.pop('page', 1))
        per_page = int(filters.pop('per_page', 20))

        paginated_result = payment_service.get_all(filters=filters, page=page, per_page=per_page)

        return jsonify({
            "data": payments_schema.dump(paginated_result.items),
            "pagination": {
                "total_pages": paginated_result.pages,
                "total_items": paginated_result.total,
                "current_page": paginated_result.page
            }
        })
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500


# Tek bir ödemenin detayını, güncellemesini ve silinmesini yöneten endpoint'ler
@payment_bp.route('/payments/<int:payment_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_payment(payment_id):
    """Tek bir ödeme üzerinde GET, PUT, DELETE işlemlerini yapar."""
    try:
        if request.method == 'GET':
            payment = payment_service.get_by_id(payment_id)
            return jsonify(payment_schema.dump(payment))

        elif request.method == 'PUT':
            json_data = request.get_json()
            if not json_data:
                return jsonify({"error": "No input data provided"}), 400

            data = payment_update_schema.load(json_data)
            updated_payment = payment_service.update(payment_id, data)
            return jsonify(payment_schema.dump(updated_payment))

        elif request.method == 'DELETE':
            payment_service.delete(payment_id)
            # Başarılı silme işleminde standart olarak 204 No Content döner.
            return '', 204

    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
