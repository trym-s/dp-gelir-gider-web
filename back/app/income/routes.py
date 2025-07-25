import io
from decimal import Decimal
from datetime import datetime
from app import db
import json
import pandas as pd
from flask import Blueprint, jsonify, request, send_file
from marshmallow import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models import Income, Customer, BudgetItem, Region, AccountName, IncomeReceipt, IncomeStatus
from .services import CustomerService, IncomeService, IncomeReceiptService
from .schemas import CustomerSchema, IncomeSchema, IncomeUpdateSchema, IncomeReceiptSchema
from ..errors import AppError
from app.auth import permission_required
from flask_jwt_extended import jwt_required


income_bp = Blueprint('income_api', __name__, url_prefix='/api')

# --- Customer (Müşteri) Rotaları (Eski Company Rotaları Güncellendi) ---
customer_service = CustomerService()
customer_schema = CustomerSchema()
customers_schema = CustomerSchema(many=True)



@income_bp.route('/customers', methods=['POST'])
@jwt_required()
@permission_required('income:create')
def create_customer():
    json_data = request.get_json()
    try:
        data = customer_schema.load(json_data)
        new_customer = customer_service.create(data)
        return jsonify(customer_schema.dump(new_customer)), 201
    except (ValidationError, AppError) as e:
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code

@income_bp.route('/customers', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def get_all_customers():
    customers = customer_service.get_all()
    return jsonify(customers_schema.dump(customers))

@income_bp.route('/customers/<int:customer_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
@permission_required('income:update') # Genel bir güncelleme izni
def handle_customer(customer_id):
    try:
        if request.method == 'GET':
            customer = customer_service.get_by_id(customer_id)
            return jsonify(customer_schema.dump(customer))
        elif request.method == 'PUT':
            json_data = request.get_json()
            data = customer_schema.load(json_data, partial=True)
            updated_customer = customer_service.update(customer_id, data)
            return jsonify(customer_schema.dump(updated_customer))
        elif request.method == 'DELETE':
            customer_service.delete(customer_id)
            return '', 204
    except (ValidationError, AppError) as e:
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code

# --- Income (Gelir) Rotaları ---
income_service = IncomeService()
income_schema = IncomeSchema()
incomes_schema = IncomeSchema(many=True)
income_update_schema = IncomeUpdateSchema()


@income_bp.route('/incomes', methods=['POST'])
@jwt_required()
@permission_required('income:create')
def create_income():
    json_data = request.get_json()
    schema = IncomeSchema(session=db.session)
    try:
        new_income = schema.load(json_data)
        income_service.create(new_income)
        db.session.add(new_income)
        db.session.commit()
        return jsonify(income_schema.dump(new_income)), 201
    except (ValidationError, AppError) as e:
        db.session.rollback()
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        return jsonify(messages), 400

@income_bp.route('/incomes', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def get_all_incomes():
    filters = request.args.to_dict()
    page = int(filters.pop('page', 1))
    per_page = int(filters.pop('per_page', 20))
    sort_by = filters.pop('sort_by', 'issue_date') # DEĞİŞTİ: date -> issue_date
    sort_order = filters.pop('sort_order', 'desc')
    
    paginated_result = income_service.get_all(
        filters=filters, page=page, per_page=per_page,
        sort_by=sort_by, sort_order=sort_order
    )
    
    return jsonify({
        "data": incomes_schema.dump(paginated_result.items),
        "pagination": {
            "total_pages": paginated_result.pages,
            "total_items": paginated_result.total,
            "current_page": paginated_result.page
        }
    })

@income_bp.route('/incomes/<int:income_id>', methods=['GET', 'PUT', 'DELETE'], strict_slashes=False)
@jwt_required()
def handle_income(income_id):
    # Bu fonksiyonun içinde GET, PUT, DELETE için ayrı izinler kontrol edilebilir.
    # Şimdilik genel bir yapı bırakıldı.
    try:
        income = income_service.get_by_id(income_id)

        if request.method == 'GET':
            return jsonify(income_schema.dump(income))
        
        elif request.method == 'PUT':
            json_data = request.get_json()

            numeric_fields = ['total_amount', 'received_amount']
            for field in numeric_fields:
                if field in json_data and json_data[field] is not None:
                    try:
                        json_data[field] = Decimal(str(json_data[field]))
                    except (ValueError, TypeError):
                        raise AppError(f"'{field}' alanı için geçersiz sayısal değer.", 400)

            schema = IncomeUpdateSchema(session=db.session) 
            updated_income = schema.load(json_data, instance=income, partial=True)
            db.session.commit()
            return jsonify(income_schema.dump(updated_income))                    

        elif request.method == 'DELETE':
            db.session.delete(income)
            db.session.commit()
            return '', 204
    except (ValidationError, AppError) as e:
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Beklenmedik bir sunucu hatası oluştu: {str(e)}"}), 500

# --- Income Receipt (Gelir Tahsilat) Rotaları ---
receipt_service = IncomeReceiptService()
receipt_schema = IncomeReceiptSchema()

# ... (Mevcut receipt route'larınız doğru, olduğu gibi kalabilir) ...

# --- Excel ve Pivot Rotaları ---
@income_bp.route('/incomes/pivot', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def get_income_pivot():
    # Bu fonksiyonun içeriği yeni modele göre güncellenmelidir.
    # Şimdilik placeholder olarak bırakıldı.
    return jsonify({"message": "Pivot table logic needs to be updated for new model."}), 200

@income_bp.route("/incomes/download-template", methods=['GET'])
@jwt_required()
@permission_required('income:read')
def download_income_template():
    header_map = {
        'Fatura İsmi': 'invoice_name',
        'Fatura No': 'invoice_number',
        'Müşteri': 'customer_name',
        'Düzenleme Tarihi': 'issue_date',
        'Genel Toplam': 'total_amount',
        # Yok sayılacaklar dahil edilebilir, backend bunları zaten işlemez.
        'Kategori': 'category_ignored',
        'Vergiler Hariç Toplam': 'total_excluding_tax_ignored',
        'Tahsilat Durumu': 'status_ignored',
        'Geciken Gün Sayısı': 'overdue_days_ignored',
        'Son Tahsilat Tarihi': 'last_receipt_date_ignored'
    }
    df = pd.DataFrame(columns=list(header_map.keys())) # Kullanıcı dostu başlıkları kullan
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Gelirler')
    output.seek(0)
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name='gelir_taslak.xlsx')


@income_bp.route("/incomes/upload", methods=["POST"])
@jwt_required()
@permission_required('income:create')
def upload_incomes():
    if 'file' not in request.files:
        return jsonify({"message": "Dosya bulunamadı"}), 400

    try:
        df = pd.read_excel(request.files['file'], dtype=str).fillna('')
        df.columns = [str(c).strip() for c in df.columns]

        header_map = {
            'Fatura ismi': 'invoice_name', 'Fatura no': 'invoice_number',
            'Müşteri': 'customer_name', 'Düzenleme tarihi': 'issue_date',
            'Genel Toplam': 'total_amount',
        }
        df.rename(columns=header_map, inplace=True)

        # --- VALIDASYON BAŞLANGICI ---
        # 1. Mevcut verileri veritabanından tek seferde çekelim
        existing_invoice_numbers = {num for num, in db.session.execute(select(Income.invoice_number)).all()}
        existing_customers = {c.name.lower().strip(): c.id for c in Customer.query.all()}
        
        # 2. Excel içindeki duplike fatura no'ları bulalım
        excel_invoice_numbers = df['invoice_number'].dropna()
        duplicates_in_excel = {num for num in excel_invoice_numbers if excel_invoice_numbers.tolist().count(num) > 1}

        results = []
        for index, row in df.iterrows():
            original_row_data = row.to_dict()
            errors = {}
            status = "invalid"

            # 3. Fatura No kontrolleri
            invoice_num = original_row_data.get('invoice_number')
            if not invoice_num:
                errors['invoice_number'] = "Fatura Numarası boş olamaz."
            elif invoice_num in duplicates_in_excel:
                errors['invoice_number'] = "Bu Fatura Numarası Excel dosyasında birden çok kez tekrarlanmış."
            elif invoice_num in existing_invoice_numbers:
                errors['invoice_number'] = "Bu Fatura Numarası veritabanında zaten mevcut."

            # 4. Müşteri kontrolü
            customer_name = original_row_data.get('customer_name', '').strip()
            customer_id = existing_customers.get(customer_name.lower())
            
            data_to_send = {
                **original_row_data,
                'customer_id': customer_id,
                'is_new_customer': customer_id is None and bool(customer_name),
                'region_id': None,
                'account_name_id': None,
                'budget_item_id': None
            }

            results.append({"row": index + 2, "data": data_to_send, "status": status, "errors": errors})

        return jsonify(results), 200

    except Exception as e:
        return jsonify({"message": f"Dosya işlenirken beklenmedik bir hata oluştu: {str(e)}"}), 500

    


@income_bp.route("/incomes/import-validated", methods=["POST"])
@jwt_required()
@permission_required('income:create')
def import_validated_incomes():
    data = request.get_json()
    rows_to_process = data.get('corrected_rows', []) # Artık sadece işlenecekler geliyor
    if not rows_to_process:
        return jsonify({"message": "İçe aktarılacak veri bulunamadı"}), 400

    successful_imports = 0
    failed_imports = []
    
    existing_invoice_numbers = {num for num, in db.session.execute(select(Income.invoice_number)).all()}
    
    for row_data in rows_to_process:
        try:
            invoice_num_to_check = row_data.get('invoice_number')
            if not invoice_num_to_check or invoice_num_to_check in existing_invoice_numbers:
                raise AppError(f"Fatura No '{invoice_num_to_check}' boş veya zaten mevcut.")

            with db.session.begin_nested():
                customer = None
                customer_name = row_data.get('customer_name', '').strip()
                customer_id = row_data.get('customer_id')

                if customer_id:
                    customer = db.session.get(Customer, customer_id)
                elif customer_name:
                    customer = Customer.query.filter(func.lower(Customer.name) == customer_name.lower()).first()
                    if not customer:
                        customer = Customer(name=customer_name)
                        db.session.add(customer)
                        db.session.flush()
                
                if not customer:
                    raise AppError("Müşteri bilgisi işlenemedi.")

                income_payload = {
                    'invoice_name': row_data.get('invoice_name'), 'invoice_number': invoice_num_to_check,
                    'total_amount': Decimal(str(row_data.get('total_amount', 0))),
                    'issue_date': pd.to_datetime(row_data.get('issue_date'), errors='coerce').strftime('%Y-%m-%d'),
                    'customer_id': customer.id, 'region_id': row_data.get('region_id'),
                    'account_name_id': row_data.get('account_name_id'), 'budget_item_id': row_data.get('budget_item_id'),
                }
                
                schema = IncomeSchema(session=db.session)
                income_object = schema.load(income_payload)
                db.session.add(income_object)
                
            successful_imports += 1
            existing_invoice_numbers.add(invoice_num_to_check)

        except (ValidationError, AppError, Exception) as e:
            failed_imports.append({
                "invoice_name": row_data.get('invoice_name', 'Bilinmeyen Satır'),
                "error": getattr(e, 'messages', str(e))
            })
            
    db.session.commit()
    return jsonify({
        "message": "İçe aktarma işlemi tamamlandı.",
        "successful_count": successful_imports,
        "failures": failed_imports
    }), 200