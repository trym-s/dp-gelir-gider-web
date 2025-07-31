import io
from decimal import Decimal
from datetime import datetime
from app import db
import json
import pandas as pd
from flask import Blueprint, jsonify, request, send_file
from marshmallow import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError 
from app.income.models import Income, IncomeReceipt, IncomeStatus
from app.customer.models import Customer
from app.budget_item.models import BudgetItem
from app.region.models import Region
from app.account_name.models import AccountName
from app.payment_type.models import PaymentType
from app.income.services import IncomeService, IncomeReceiptService
from app.customer.services import CustomerService
from app.income.schemas import IncomeSchema, IncomeUpdateSchema, IncomeReceiptSchema
from app.customer.schemas import CustomerSchema
from ..errors import AppError
from app.auth import permission_required
from flask_jwt_extended import jwt_required
from decimal import Decimal


income_bp = Blueprint('income_api', __name__, url_prefix='/api')

# --- Customer (Müşteri) Rotaları (Eski Company Rotaları Güncellendi) ---
customer_service = CustomerService
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
receipts_schema = IncomeReceiptSchema(many=True)

@income_bp.route('/incomes/<int:income_id>/receipts', methods=['POST'])
@jwt_required()
@permission_required('income:create')
def create_receipt_for_income(income_id):
    json_data = request.get_json()
    # income_id is in the URL, not the body. Remove it if present.
    json_data.pop('income_id', None)
    
    schema = IncomeReceiptSchema(session=db.session)
    try:
        new_receipt_object = schema.load(json_data)
        new_receipt = receipt_service.create(income_id, new_receipt_object)
        return jsonify(schema.dump(new_receipt)), 201
    except (ValidationError, AppError) as e:
        db.session.rollback()
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Tahsilat eklenirken beklenmedik bir hata oluştu: {str(e)}"}), 500

@income_bp.route('/incomes/<int:income_id>/receipts', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def get_receipts_for_income(income_id):
    try:
        income = income_service.get_by_id(income_id)
        return jsonify(receipts_schema.dump(income.receipts))
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code

@income_bp.route('/receipts/<int:receipt_id>', methods=['PUT'])
@jwt_required()
@permission_required('income:update')
def update_receipt(receipt_id):
    json_data = request.get_json()
    schema = IncomeReceiptSchema(session=db.session)
    try:
        if 'receipt_amount' in json_data and json_data['receipt_amount'] is not None:
            json_data['receipt_amount'] = Decimal(str(json_data['receipt_amount']))
        data = schema.load(json_data, partial=True)
        updated_receipt = receipt_service.update(receipt_id, data)
        return jsonify(receipt_schema.dump(updated_receipt))
    except (ValidationError, AppError) as e:
        db.session.rollback()
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Tahsilat güncellenirken beklenmedik bir hata oluştu: {str(e)}"}), 500

@income_bp.route('/receipts/<int:receipt_id>', methods=['DELETE'])
@jwt_required()
@permission_required('income:delete')
def delete_receipt(receipt_id):
    try:
        receipt_service.delete(receipt_id)
        return '', 204
    except AppError as e:
        db.session.rollback()
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Tahsilat silinirken beklenmedik bir hata oluştu: {str(e)}"}), 500

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
    new_headers = [
        "Düzenlenme Tarihi",
        "Müşteri",
        "Müşteri Vergi Numarası",
        "Fatura İsmi",
        "Fatura Sıra",
        "Genel Toplam"
    ]
    df = pd.DataFrame(columns=new_headers)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Gelirler')
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='gelir_taslak.xlsx'
    )

@income_bp.route("/incomes/upload", methods=["POST"])
@jwt_required()
@permission_required('income:create')
def upload_incomes():
    if 'file' not in request.files:
        return jsonify({"message": "Dosya bulunamadı"}), 400
    try:
        df = pd.read_excel(request.files['file'], sheet_name='Satış Faturaları', dtype=str).fillna('')
        df.columns = [str(c).strip() for c in df.columns]

        header_map = {
            'Düzenleme tarihi': 'issue_date',
            'Müşteri': 'customer_name',
            'Fatura ismi': 'invoice_name',
            'Fatura sıra': 'invoice_number',
            'Müşteri vergi numarası': 'tax_number',
            'Genel Toplam': 'total_amount',
            'Toplam KDV': 'total_kdv'
        }
        df.rename(columns=header_map, inplace=True)

        # Otomatik atama için gerekli ID'leri önceden veritabanından alıyoruz
        def get_ids_for_region(region_name):
            ids = {'region_id': None, 'sla_id': None, 'dba_id': None, 'bi_id': None}
            region = Region.query.filter_by(name=region_name).first()
            if not region: return ids
            
            ids['region_id'] = region.id
            sla_account = AccountName.query.join(PaymentType).filter(
                AccountName.name == 'SLA',
                PaymentType.name == 'Genel',
                PaymentType.region_id == region.id
            ).first()
            
            if not sla_account: return ids

            ids['sla_id'] = sla_account.id
            dba_item = BudgetItem.query.filter_by(name='DBA', account_name_id=sla_account.id).first()
            if dba_item: ids['dba_id'] = dba_item.id
            
            bi_item = BudgetItem.query.filter_by(name='BI', account_name_id=sla_account.id).first()
            if bi_item: ids['bi_id'] = bi_item.id
            
            return ids

        # Hem Teknopark hem de DP Merkez için ID setlerini al
        id_sets = {
            'Teknopark': get_ids_for_region('Teknopark'),
            'DP Merkez': get_ids_for_region('DP Merkez')
        }

        existing_invoice_numbers = {num for num, in db.session.execute(select(Income.invoice_number)).all()}
        existing_customers = {c.name.lower().strip(): c.id for c in Customer.query.all()}
        
        results = []
        for index, row in df.iterrows():
            row_data = row.to_dict()
            errors = {}
            status = "invalid"

            if not row_data.get('customer_name'):
                continue

            invoice_name_lower = str(row_data.get('invoice_name', '')).lower()
            
            # KDV'ye göre hangi ID setinin kullanılacağına karar ver
            id_set_to_use = None
            try:
                kdv_value_str = str(row_data.get('total_kdv', '1')).replace(',', '.')
                total_kdv_value = float(kdv_value_str)

                if total_kdv_value == 0:
                    id_set_to_use = id_sets['Teknopark']
                    row_data['region_id'] = id_set_to_use['region_id']
                else:
                    id_set_to_use = id_sets['DP Merkez']
                    row_data['region_id'] = id_set_to_use['region_id']
            except (ValueError, TypeError):
                id_set_to_use = id_sets['DP Merkez']
                row_data['region_id'] = id_set_to_use['region_id']
            
            # Seçilen ID setine göre fatura ismini kontrol et ve atamaları yap
            if id_set_to_use:
                if 'sql' in invoice_name_lower and id_set_to_use.get('dba_id'):
                    row_data['budget_item_id'] = id_set_to_use['dba_id']
                
                if 'sla' in invoice_name_lower and id_set_to_use.get('sla_id'):
                    row_data['account_name_id'] = id_set_to_use['sla_id']

                if 'dvh' in invoice_name_lower and id_set_to_use.get('bi_id'):
                    row_data['budget_item_id'] = id_set_to_use['bi_id']
            
            invoice_num = row_data.get('invoice_number')
            if not invoice_num:
                errors['invoice_number'] = "Fatura Numarası (Fatura Sıra) boş olamaz."
                status = "duplicate"
            elif invoice_num in existing_invoice_numbers:
                errors['invoice_number'] = "Bu fatura numarası veritabanında zaten mevcut."
                status = "duplicate"
            
            customer_name = row_data.get('customer_name', '').strip()
            customer_id = existing_customers.get(customer_name.lower())
            row_data['customer_id'] = customer_id
            row_data['is_new_customer'] = customer_id is None and bool(customer_name)
            
            results.append({"row": index + 2, "data": row_data, "status": status, "errors": errors})

        return jsonify(results), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Dosya okunurken hata oluştu: {str(e)}"}), 500


# back/app/income/routes.py -> Bu fonksiyonu tamamen aşağıdakiyle değiştirin.

@income_bp.route("/incomes/import-validated", methods=["POST"])
@jwt_required()
@permission_required('income:create')
def import_validated_incomes():
    data = request.get_json()
    rows_to_process = data.get('corrected_rows', [])
    if not rows_to_process:
        return jsonify({"message": "İçe aktarılacak veri bulunamadı"}), 400

    successful_count = 0
    failed_imports = []
    
    try:
        for row_data in rows_to_process:
            try:
                customer = None
                customer_name_str = row_data.get('customer_name', '').strip()
                is_new_customer_flag = row_data.get('is_new_customer', False)
                customer_id_from_upload = row_data.get('customer_id')

                if is_new_customer_flag:
                    try:
                        customer = Customer(name=customer_name_str, tax_number=row_data.get('tax_number'))
                        db.session.add(customer)
                        db.session.flush()
                    except IntegrityError:
                        db.session.rollback()
                        customer = Customer.query.filter(Customer.name.ilike(customer_name_str)).first()
                        if customer and not customer.tax_number and row_data.get('tax_number'):
                            customer.tax_number = row_data.get('tax_number')
                else:
                    customer = db.session.get(Customer, customer_id_from_upload)
                    if customer and not customer.tax_number and row_data.get('tax_number'):
                        customer.tax_number = row_data.get('tax_number')

                if not customer:
                    failed_imports.append({"invoice_name": row_data.get('invoice_name'), "error": f"Müşteri '{customer_name_str}' bulunamadı/oluşturulamadı."})
                    continue

                issue_date_str = None
                try:
                    parsed_date = pd.to_datetime(row_data.get('issue_date'), errors='coerce')
                    if pd.notna(parsed_date):
                        issue_date_str = parsed_date.strftime('%Y-%m-%d')
                    else:
                        raise ValueError("Geçersiz tarih formatı")
                except Exception:
                    failed_imports.append({"invoice_name": row_data.get('invoice_name', 'Bilinmeyen Satır'), "error": f"Geçersiz tarih formatı: {row_data.get('issue_date')}"})
                    continue

                # --- TUTAR (AMOUNT) ALANINI TEMİZLEME MANTIĞI ---
                amount_str = str(row_data.get('total_amount', '0'))
                cleaned_amount_str = amount_str.replace('$', '').replace(',', '')
                # ------------------------------------------------

                income_payload = {
                    'invoice_name': row_data.get('invoice_name'), 
                    'invoice_number': row_data.get('invoice_number'),
                    'total_amount': Decimal(cleaned_amount_str), # Temizlenmiş değeri kullan
                    'issue_date': issue_date_str, 
                    'customer_id': customer.id, 
                    'region_id': row_data.get('region_id'), 
                    'account_name_id': row_data.get('account_name_id'), 
                    'budget_item_id': row_data.get('budget_item_id'),
                }
                
                schema = IncomeSchema(session=db.session)
                income_object = schema.load(income_payload)
                db.session.add(income_object)
                db.session.commit() # Commit each income individually
                successful_count += 1

            except (ValidationError, AppError, Exception) as e:
                # No rollback here, allow other rows to be processed
                failed_imports.append({"invoice_name": row_data.get('invoice_name', 'Bilinmeyen Satır'), "error": getattr(e, 'messages', str(e))})
        
        # No global commit here, as each is committed individually

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"İçe aktarma sırasında genel bir hata oluştu: {str(e)}"}), 500
    
    return jsonify({"message": "İçe aktarma işlemi tamamlandı.", "successful_count": successful_count, "failures": failed_imports}), 200


@income_bp.route("/incomes/upload-dubai", methods=["POST"])
@jwt_required()
@permission_required('income:create')
def upload_dubai_incomes():
    if 'file' not in request.files:
        return jsonify({"message": "Dosya bulunamadı"}), 400
    try:
        # Dosya adında 'Invoices' geçtiği için sayfa adının bu olduğunu varsayıyoruz
        df = pd.read_excel(request.files['file'], sheet_name='Invoices', dtype=str).fillna('')
        df.columns = [str(c).strip() for c in df.columns]

        # Dubai formatına özel sütun eşleştirmesi
        header_map = {
            'INVOICE_ID': 'invoice_number',
            'Date': 'issue_date',
            'Invoice#': 'invoice_name',
            'Customer Name': 'customer_name',
            'Amount': 'total_amount'
        }
        df.rename(columns=header_map, inplace=True)

        # Gerekli ID'leri ve mevcut müşterileri önceden alalım
        dubai_region = Region.query.filter_by(name='Dubai').first()
        if not dubai_region:
            return jsonify({"message": "Veritabanında 'Dubai' adında bir bölge bulunamadı."}), 404
        
        existing_invoice_numbers = {num for num, in db.session.execute(select(Income.invoice_number)).all()}
        existing_customers = {c.name.strip().casefold(): c for c in Customer.query.all()}
        
        results = []
        new_customer_dummy_tax_map = {}
        tax_counter = 1

        for index, row in df.iterrows():
            row_data = row.to_dict()
            errors = {}
            status = "invalid"

            # 1. Bölge her zaman Dubai olacak
            row_data['region_id'] = dubai_region.id
            
            # 2. Hesap Adı ve Bütçe Kalemi manuel seçilecek (boş bırakıyoruz)
            row_data['account_name_id'] = None
            row_data['budget_item_id'] = None

            # 3. Müşteri ve Vergi Numarası Mantığı
            customer_name_str = row_data.get('customer_name', '').strip()
            customer_name_casefolded = customer_name_str.casefold()
            
            existing_customer = existing_customers.get(customer_name_casefolded)
            
            if existing_customer:
                # Müşteri varsa, ID'sini ve mevcut VKN'sini al
                row_data['customer_id'] = existing_customer.id
                row_data['is_new_customer'] = False
                row_data['tax_number'] = existing_customer.tax_number
            else:
                # Müşteri yeniyse, ona özel dummy VKN oluştur
                row_data['customer_id'] = None
                row_data['is_new_customer'] = True
                if customer_name_casefolded not in new_customer_dummy_tax_map:
                    # --- DEĞİŞİKLİK BURADA: Daha kısa bir dummy VKN üretiyoruz ---
                    new_customer_dummy_tax_map[customer_name_casefolded] = f"DBI-{tax_counter:06d}"
                    tax_counter += 1
                row_data['tax_number'] = new_customer_dummy_tax_map[customer_name_casefolded]

            # Fatura no kontrolü
            invoice_num = row_data.get('invoice_number')
            if not invoice_num:
                errors['invoice_number'] = "INVOICE_ID boş olamaz."
                status = "duplicate"
            elif invoice_num in existing_invoice_numbers:
                errors['invoice_number'] = "Bu fatura numarası zaten mevcut."
                status = "duplicate"
            
            results.append({"row": index + 2, "data": row_data, "status": status, "errors": errors})

        return jsonify(results), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Dubai faturası işlenirken hata oluştu: {str(e)}"}), 500