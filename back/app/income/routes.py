from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from .services import CompanyService, IncomeService, IncomeReceiptService
from .schemas import CompanySchema, IncomeSchema, IncomeUpdateSchema, IncomeReceiptSchema
from ..errors import AppError

income_bp = Blueprint('income_api', __name__, url_prefix='/api')

# Company routes
company_service = CompanyService()
company_schema = CompanySchema()
companies_schema = CompanySchema(many=True)

@income_bp.route('/companies', methods=['POST'])
def create_company():
    json_data = request.get_json()
    try:
        data = company_schema.load(json_data)
        new_company = company_service.create(data)
        return jsonify(company_schema.dump(new_company)), 201
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

@income_bp.route('/companies', methods=['GET'])
def get_all_companies():
    companies = company_service.get_all()
    return jsonify(companies_schema.dump(companies))

@income_bp.route('/companies/<int:company_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_company(company_id):
    try:
        if request.method == 'GET':
            company = company_service.get_by_id(company_id)
            return jsonify(company_schema.dump(company))
        elif request.method == 'PUT':
            json_data = request.get_json()
            data = company_schema.load(json_data, partial=True)
            updated_company = company_service.update(company_id, data)
            return jsonify(company_schema.dump(updated_company))
        elif request.method == 'DELETE':
            company_service.delete(company_id)
            return '', 204
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

# Income routes
income_service = IncomeService()
income_schema = IncomeSchema()
incomes_schema = IncomeSchema(many=True)
income_update_schema = IncomeUpdateSchema()

@income_bp.route('/incomes', methods=['POST'])
def create_income():
    json_data = request.get_json()
    try:
        data = income_schema.load(json_data)
        new_income = income_service.create(data)
        return jsonify(income_schema.dump(new_income)), 201
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

@income_bp.route('/incomes', methods=['GET'])
def get_all_incomes():
    filters = request.args.to_dict()
    page = int(filters.pop('page', 1))
    per_page = int(filters.pop('per_page', 20))
    paginated_result = income_service.get_all(filters=filters, page=page, per_page=per_page)
    return jsonify({
        "data": incomes_schema.dump(paginated_result.items),
        "pagination": {
            "total_pages": paginated_result.pages,
            "total_items": paginated_result.total,
            "current_page": paginated_result.page
        }
    })

@income_bp.route('/incomes/<int:income_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_income(income_id):
    try:
        if request.method == 'GET':
            income = income_service.get_by_id(income_id)
            return jsonify(income_schema.dump(income))
        elif request.method == 'PUT':
            json_data = request.get_json()
            data = income_update_schema.load(json_data)
            updated_income = income_service.update(income_id, data)
            return jsonify(income_schema.dump(updated_income))
        elif request.method == 'DELETE':
            income_service.delete(income_id)
            return '', 204
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

# Income Receipt routes
receipt_service = IncomeReceiptService()
receipt_schema = IncomeReceiptSchema()
receipts_schema = IncomeReceiptSchema(many=True)

@income_bp.route('/receipts', methods=['GET'], strict_slashes=False)
def get_all_receipts():
    """Tarih aralığına göre tüm gelir makbuzlarını listeler."""
    try:
        filters = {k: v for k, v in request.args.items() if v is not None}
        sort_by = filters.pop('sort_by', 'receipt_date')
        sort_order = filters.pop('sort_order', 'desc')
        
        receipts = receipt_service.get_all(filters=filters, sort_by=sort_by, sort_order=sort_order)
        
        return jsonify(receipts_schema.dump(receipts)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@income_bp.route('/incomes/<int:income_id>/receipts', methods=['POST'])
def create_receipt_for_income(income_id):
    json_data = request.get_json()
    try:
        data = receipt_schema.load(json_data)
        new_receipt = receipt_service.create(income_id, data)
        return jsonify(receipt_schema.dump(new_receipt)), 201
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

@income_bp.route('/receipts/<int:receipt_id>', methods=['PUT', 'DELETE'])
def handle_receipt(receipt_id):
    try:
        if request.method == 'PUT':
            json_data = request.get_json()
            data = receipt_schema.load(json_data, partial=True)
            updated_receipt = receipt_service.update(receipt_id, data)
            return jsonify(receipt_schema.dump(updated_receipt))
        elif request.method == 'DELETE':
            receipt_service.delete(receipt_id)
            return '', 204
    except ValidationError as err:
        return jsonify(err.messages), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code