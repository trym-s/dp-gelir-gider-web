from flask import send_file,Blueprint, request, jsonify
from marshmallow import ValidationError
from datetime import datetime
from app import db
from ..models import Income, Company, BudgetItem
from .services import CompanyService, IncomeService, IncomeReceiptService
from .schemas import CompanySchema, IncomeSchema, IncomeUpdateSchema, IncomeReceiptSchema
from ..errors import AppError
import pandas as pd
import io
from app.models import Income, db  # Income modelini ve db'yi import edin
from app.income.schemas import IncomeSchema # Income şemasını import edin
from marshmallow import ValidationError
from decimal import Decimal

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
    sort_by = filters.pop('sort_by', 'date')
    sort_order = filters.pop('sort_order', 'desc')
    
    paginated_result = income_service.get_all(
        filters=filters, 
        page=page, 
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
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


@income_bp.route('/incomes/pivot', methods=['GET'])
def get_income_pivot():
    try:
        month_str = request.args.get("month")
        if not month_str:
            return jsonify({"error": "Month parameter is required"}), 400

        year, month = map(int, month_str.split("-"))
        start_date = datetime(year, month, 1)
        end_date = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        query = (
            db.session.query(
                Income.id,
                Income.date,
                Income.total_amount,
                Income.description,
                Company.id.label("company_id"),
                Company.name.label("company_name"),
                BudgetItem.id.label("budget_item_id"),
                BudgetItem.name.label("budget_item_name")
            )
            .join(Company, Company.id == Income.company_id)
            .join(BudgetItem, BudgetItem.id == Income.budget_item_id)
            .filter(Income.date >= start_date, Income.date < end_date)
        )

        results = query.all()

        data = []
        for row in results:
            data.append({
                "id": row.id,
                "date": row.date.strftime("%Y-%m-%d"),
                "day": row.date.day,
                "description": row.description,
                "amount": float(row.total_amount),
                "budget_item_id": row.budget_item_id,
                "budget_item_name": row.budget_item_name,
                "company_id": row.company_id,
                "company_name": row.company_name,
            })

        return jsonify(data), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@income_bp.route("/incomes/download-template", methods=['GET'])
def download_income_template():
    header_map = {
        'description': 'Açıklama',
        'total_amount': 'Toplam Tutar',
        'date': 'Tarih (GG.AA.YYYY)', # Kullanıcıya format ipucu ver
        'company_id': 'Şirket ',
        'region_id': 'Bölge ',
        'account_name_id': 'Hesap Adı ',
        'budget_item_id': 'Bütçe Kalemi '
    }
    turkish_headers = list(header_map.values())
    df = pd.DataFrame(columns=turkish_headers)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Gelirler')
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='gelir_taslak.xlsx'
    )

@income_bp.route("/incomes/upload", methods=["POST"])
def upload_incomes():
    if 'file' not in request.files:
        return jsonify({"message": "Dosya bulunamadı"}), 400
    file = request.files['file']
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"message": "Geçersiz dosya formatı."}), 400
    
    try:
        df = pd.read_excel(file)
        # Sütun isimleri Income modeli ile eşleşmeli

        header_map = {
            'description': 'Açıklama',
            'total_amount': 'Toplam Tutar',
            'date': 'Tarih (GG.AA.YYYY)',
            'company_id': 'Şirket ',
            'region_id': 'Bölge ',
            'account_name_id': 'Hesap Adı ',
            'budget_item_id': 'Bütçe Kalemi '
        }

        reverse_header_map = {v: k for k, v in header_map.items()}
        df.rename(columns=reverse_header_map, inplace=True)
        
        results = []
        schema = IncomeSchema()

        for index, row in df.iterrows():
            row_data = row.to_dict()
            try:
                schema.load(row_data)
                results.append({"row": index + 2, "data": row_data, "status": "valid"})
            except ValidationError as err:
                results.append({"row": index + 2, "data": row_data, "status": "invalid", "errors": err.messages})
        
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"message": f"Dosya işlenirken hata oluştu: {str(e)}"}), 500

@income_bp.route("/incomes/import-validated", methods=["POST"])
def import_validated_incomes():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Veri bulunamadı"}), 400

    valid_rows = data.get('valid_rows', [])
    corrected_rows = data.get('corrected_rows', [])
    all_rows = valid_rows + corrected_rows
    
    incomes_to_create = []
    
    for row_data in all_rows:
        try:
            row_data['total_amount'] = Decimal(row_data['total_amount'])
            # Gelir ilk oluşturulduğunda alınan tutar 0'dır
            row_data['received_amount'] = Decimal('0.00')
            
            row_data.pop('key', None)
            row_data.pop('errors', None)

            income = Income(**row_data)
            incomes_to_create.append(income)
        except (TypeError, KeyError, ValueError) as e:
            db.session.rollback()
            return jsonify({"message": f"Hatalı veri yapısı: {row_data}. Hata: {e}"}), 400

    try:
        db.session.bulk_save_objects(incomes_to_create)
        db.session.commit()
        return jsonify({"message": f"{len(incomes_to_create)} adet gelir başarıyla içe aktarıldı."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Veritabanı kaydı sırasında hata: {str(e)}"}), 500    