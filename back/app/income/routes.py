import io
from decimal import Decimal
from datetime import datetime, timedelta
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
from collections import defaultdict 



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
    if not json_data:
        return jsonify({"error": "Giriş verisi bulunamadı."}), 400

    try:
        # Gelen verinin kaynağını kontrol et
        if json_data.get('source') == 'income_form':
            # --- HIZLI EKLEME MANTIĞI (GELİR FORMU'NDAN GELEN İSTEK) ---
            
            customer_name = json_data.get('name')
            if not customer_name:
                raise AppError("Müşteri adı zorunludur.", 400)
            if Customer.query.filter_by(name=customer_name).first():
                raise AppError(f"'{customer_name}' isimli müşteri zaten mevcut.", 409)

            # Otomatik ve benzersiz vergi numarası oluştur
            last_dpt_customer = Customer.query.filter(Customer.tax_number.like('DPT-%')).order_by(db.func.cast(db.func.substring(Customer.tax_number, 5), db.Integer).desc()).first()
            
            next_number = 1
            if last_dpt_customer and last_dpt_customer.tax_number:
                try:
                    next_number = int(last_dpt_customer.tax_number.split('-')[1]) + 1
                except (IndexError, ValueError):
                    pass # Hata olursa 1'den devam et
            
            new_tax_number = f"DPT-{next_number:05d}"
            
            # Yeni müşteri nesnesini oluştur
            new_customer = Customer(name=customer_name, tax_number=new_tax_number)
            db.session.add(new_customer)
            db.session.commit()
            
            return jsonify(customer_schema.dump(new_customer)), 201

        else:
            # --- STANDART EKLEME MANTIĞI (DİĞER YERLERDEN GELEN İSTEK) ---
            # Gelen verinin şemaya uygun olmasını (name ve tax_number içermesini) bekle
            
            # Ekstra güvenlik: Standart eklemede de duplikasyon kontrolü yapalım
            if 'name' in json_data and Customer.query.filter_by(name=json_data['name']).first():
                raise AppError(f"'{json_data['name']}' isimli müşteri zaten mevcut.", 409)
            if 'tax_number' in json_data and Customer.query.filter_by(tax_number=json_data['tax_number']).first():
                 raise AppError(f"'{json_data['tax_number']}' vergi numarası zaten kullanılıyor.", 409)

            new_customer_obj = customer_schema.load(json_data)
            db.session.add(new_customer_obj)
            db.session.commit()
            return jsonify(customer_schema.dump(new_customer_obj)), 201

    except (ValidationError, AppError) as e:
        db.session.rollback()
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Beklenmedik bir sunucu hatası oluştu: {str(e)}"}), 500



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
        updated_income = receipt_service.create(income_id, new_receipt_object)
        #new_receipt = receipt_service.create(income_id, new_receipt_object)
        return jsonify(income_schema.dump(updated_income)), 201
    except (ValidationError, AppError) as e:
        db.session.rollback()
        messages = e.messages if isinstance(e, ValidationError) else {"error": e.message}
        status_code = 400 if isinstance(e, ValidationError) else e.status_code
        return jsonify(messages), status_code
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Tahsilat eklenirken beklenmedik bir hata oluştu: {str(e)}"}, 500)

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
    month_param = request.args.get('month')
    if not month_param:
        return jsonify({"error": "Ay parametresi (month) eksik."}), 400

    try:
        year, month = map(int, month_param.split('-'))
        start_date = datetime(year, month, 1).date()
        end_date = (start_date + timedelta(days=31)).replace(day=1) - timedelta(days=1)
    except ValueError:
        return jsonify({"error": "Geçersiz ay formatı. YYYY-MM formatında olmalı."}), 400

    try:
        query = db.session.query(
            Income.issue_date,
            Income.total_amount,
            Income.currency,
            BudgetItem.name.label('budget_item_name'),
            Customer.name.label('company_name'),
            Income.invoice_name.label('description')
        ).join(Income.customer).join(Income.budget_item)\
         .filter(Income.issue_date.between(start_date, end_date))\
         .filter(func.trim(Customer.name) != '')\
         .filter(func.trim(BudgetItem.name) != '')
        
        incomes = query.all()

        processed_data = defaultdict(lambda: defaultdict(lambda: defaultdict(Decimal)))
        
        for income in incomes:
            key = (income.budget_item_name, income.company_name, income.description)
            day = income.issue_date.day
            processed_data[key][day][income.currency.name] += income.total_amount

        groups = defaultdict(list)
        for key, daily_values in processed_data.items():
            budget_item, company, desc = key
            child_entry = {
                'firma': company,
                'description': desc,
                'toplam': defaultdict(Decimal)
            }
            for day, currency_values in daily_values.items():
                # --- HATA DÜZELTMESİ 1: k.name -> k ---
                child_entry[str(day)] = {k: v for k, v in currency_values.items()}
                for currency_str, amount in currency_values.items():
                    child_entry['toplam'][currency_str] += amount
            
            groups[budget_item].append(child_entry)

        result_list = []
        for budget_item_name, children_list in groups.items():
            group_total_by_currency = defaultdict(Decimal)
            for child in children_list:
                # --- HATA DÜZELTMESİ 2: k.name -> k ---
                child['toplam'] = {k: float(v) for k,v in child['toplam'].items()}
                for currency_str, total in child['toplam'].items():
                    group_total_by_currency[currency_str] += Decimal(str(total))
            
            group_data = {
                'budget_item_name': budget_item_name,
                'children': sorted(children_list, key=lambda x: x['firma']),
                # --- HATA DÜZELTMESİ 3: k.name -> k ---
                'toplam': {k: float(v) for k,v in group_total_by_currency.items()}
            }
            result_list.append(group_data)

        return jsonify(sorted(result_list, key=lambda x: x['budget_item_name'])), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Gelir pivot verisi getirilirken hata oluştu: {str(e)}"}), 500


@income_bp.route('/incomes/yearly_pivot', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def get_income_yearly_pivot():
    year_param = request.args.get('year')
    if not year_param or not year_param.isdigit():
        return jsonify({"error": "Yıl parametresi (year) eksik veya geçersiz."}), 400

    year = int(year_param)

    try:
        pivot_data = income_service.get_yearly_report_pivot_data(year)
        return jsonify(pivot_data), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Yıllık gelir pivot verisi getirilirken hata oluştu: {str(e)}"}), 500




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
            'Toplam KDV': 'total_kdv',
            'Son tahsilat tarihi': 'due_date'
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
from sqlalchemy.exc import IntegrityError
import re # Normal ifadeler için bu modülü import ediyoruz

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
                tax_number_str = row_data.get('tax_number', '').strip()

                if not customer_name_str:
                    raise ValueError("Müşteri adı boş olamaz.")

                # --- YENİ VE EN SAĞLAM MÜŞTERİ BULMA/OLUŞTURMA MANTIĞI ---
                # Önce vergi numarasına göre ara (en güvenilir yöntem)
                if tax_number_str:
                    customer = Customer.query.filter_by(tax_number=tax_number_str).first()
                
                # Eğer vergi numarasıyla bulunamadıysa, isme göre ara
                if not customer and customer_name_str:
                    customer = Customer.query.filter(Customer.name.ilike(customer_name_str)).first()

                # Hala bulunamadıysa, YENİ olarak oluştur
                if not customer:
                    customer = Customer(name=customer_name_str, tax_number=tax_number_str if tax_number_str else None)
                    db.session.add(customer)
                    db.session.flush() # ID'sinin oluşması için
                # --- YENİ MANTIĞIN SONU ---

                # Tarih ve Tutar alanlarını işle
                issue_date_str = pd.to_datetime(row_data.get('issue_date'), errors='coerce').strftime('%Y-%m-%d')
                amount_str = re.sub(r'[^\d.]', '', str(row_data.get('total_amount', '0')))
                due_date_str = pd.to_datetime(row_data.get('due_date'), errors='coerce').strftime('%Y-%m-%d') if pd.notna(pd.to_datetime(row_data.get('due_date'), errors='coerce')) else None

                income = Income(
                    invoice_name=row_data.get('invoice_name'), invoice_number=row_data.get('invoice_number'),
                    total_amount=Decimal(amount_str), issue_date=issue_date_str, due_date=due_date_str,
                    customer_id=customer.id, region_id=row_data.get('region_id'),
                    account_name_id=row_data.get('account_name_id'), budget_item_id=row_data.get('budget_item_id'),
                    currency=row_data.get('currency', 'TRY'),
                )
                db.session.add(income)
                db.session.flush()
                successful_count += 1

            except IntegrityError:
                db.session.rollback()
                failed_imports.append({"invoice_name": row_data.get('invoice_name'), "error": "Veritabanı hatası (Yinelenen fatura no)."})
            except Exception as e:
                db.session.rollback()
                failed_imports.append({"invoice_name": row_data.get('invoice_name'), "error": str(e)})
        
        db.session.commit()

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
        df = pd.read_excel(request.files['file'], sheet_name='Invoices', dtype=str).fillna('')
        df.columns = [str(c).strip() for c in df.columns]

        header_map = {
            'INVOICE_ID': 'invoice_number', 'Date': 'issue_date',
            'Invoice#': 'invoice_name', 'Customer Name': 'customer_name',
            'Amount': 'total_amount', 'Due Date': 'due_date'
        }
        df.rename(columns=header_map, inplace=True)

        dubai_region = Region.query.filter_by(name='Dubai').first()
        if not dubai_region:
            return jsonify({"message": "Veritabanında 'Dubai' adında bir bölge bulunamadı."}), 404
        
        existing_invoice_numbers = {num for num, in db.session.execute(select(Income.invoice_number)).all()}
        existing_customers = {c.name.strip().casefold(): c for c in Customer.query.all()}
        
        # --- YENİ VE SAĞLAM VKN SAYACI MANTIĞI ---
        last_dummy_vkn = db.session.query(func.max(Customer.tax_number)).filter(Customer.tax_number.like('DBI-%')).scalar()
        
        if last_dummy_vkn:
            # En son numarayı al ve 1 artır
            tax_counter = int(last_dummy_vkn.split('-')[1]) + 1
        else:
            # Hiç dummy VKN yoksa 1'den başla
            tax_counter = 1
        # --- GÜNCELLEME SONU ---
        
        results = []
        new_customer_dummy_tax_map = {}

        for index, row in df.iterrows():
            row_data = row.to_dict()
            errors = {}
            status = "invalid"

            row_data['region_id'] = dubai_region.id
            row_data['account_name_id'] = None
            row_data['budget_item_id'] = None
            row_data['currency'] = 'USD'

            customer_name_str = row_data.get('customer_name', '').strip()
            customer_name_casefolded = customer_name_str.casefold()
            
            existing_customer = existing_customers.get(customer_name_casefolded)
            
            if existing_customer:
                row_data['customer_id'] = existing_customer.id
                row_data['is_new_customer'] = False
                row_data['tax_number'] = existing_customer.tax_number
            else:
                row_data['customer_id'] = None
                row_data['is_new_customer'] = True
                if customer_name_casefolded not in new_customer_dummy_tax_map:
                    new_customer_dummy_tax_map[customer_name_casefolded] = f"DBI-{tax_counter:06d}"
                    tax_counter += 1
                row_data['tax_number'] = new_customer_dummy_tax_map[customer_name_casefolded]

            invoice_num = row_data.get('invoice_number')
            if not invoice_num or invoice_num in existing_invoice_numbers:
                errors['invoice_number'] = "Fatura numarası boş veya zaten mevcut."
                status = "duplicate"
            
            results.append({"row": index + 2, "data": row_data, "status": status, "errors": errors})

        return jsonify(results), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Dubai faturası işlenirken hata oluştu: {str(e)}"}), 500
    

@income_bp.route("/incomes/download-template", methods=['GET'])
@jwt_required()
@permission_required('income:read')
def download_income_template():
    try:
        # 1. Frontend'den gelen filtreleri al
        filters = request.args.to_dict()
        
        # 2. Yeni servis fonksiyonu ile tüm filtrelenmiş verileri çek
        incomes = income_service.get_all_filtered(filters=filters)
        
        if not incomes:
            return jsonify({"message": "Dışa aktarılacak veri bulunamadı."}), 404

        # 3. Veriyi Excel'e uygun formata dönüştür
        data_to_export = []
        for income in incomes:
            data_to_export.append({
                'Fatura No': income.invoice_number,
                'Fatura İsmi': income.invoice_name,
                'Müşteri': income.customer.name if income.customer else '',
                'Vergi Numarası': income.customer.tax_number if income.customer and income.customer.tax_number else '',
                'Toplam Tutar': float(income.total_amount),
                'Tahsil Edilen': float(income.received_amount),
                'Durum': income.status.name if income.status else '',
                'Ödeme Zamanlaması': income.timeliness_status.name if income.timeliness_status else '',
                'Düzenleme Tarihi': income.issue_date.strftime('%d.%m.%Y') if income.issue_date else '',
                'Vade Tarihi': income.due_date.strftime('%d.%m.%Y') if income.due_date else ''
            })
            
        df = pd.DataFrame(data_to_export)
        
        # 4. Excel dosyasını oluştur ve gönder
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Gelirler')
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"gelirler_raporu_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Dışa aktarma sırasında bir hata oluştu: {str(e)}"}), 500


@income_bp.route('/incomes/export', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def export_incomes():
    try:
        filters = request.args.to_dict()
        incomes = income_service.get_all_filtered(filters=filters)
        
        if not incomes:
            return jsonify({"message": "Dışa aktarılacak veri bulunamadı."}), 404

        data_to_export = []
        for income in incomes:
            data_to_export.append({
                'Fatura No': income.invoice_number,
                'Fatura İsmi': income.invoice_name,
                'Müşteri': income.customer.name if income.customer else '',
                'Vergi Numarası': income.customer.tax_number if income.customer and income.customer.tax_number else '',
                'Toplam Tutar': float(income.total_amount),
                'Tahsil Edilen': float(income.received_amount),
                'Durum': income.status.name if income.status else '',
                'Ödeme Zamanlaması': income.timeliness_status.name if income.timeliness_status else '',
                'Düzenleme Tarihi': income.issue_date.strftime('%d.%m.%Y') if income.issue_date else '',
                'Vade Tarihi': income.due_date.strftime('%d.%m.%Y') if income.due_date else ''
            })
            
        df = pd.DataFrame(data_to_export)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Gelirler')
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"gelirler_raporu_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Dışa aktarma sırasında bir hata oluştu: {str(e)}"}), 500
    

@income_bp.route('/monthly_collections_report', methods=['GET'])
@jwt_required()
@permission_required('income:read')
def get_monthly_collections_data():
    month_param = request.args.get('month')
    if not month_param:
        return jsonify({"error": "Ay parametresi (month) eksik."}), 400

    try:
        year, month = map(int, month_param.split('-'))
        report_data = income_service.get_report_pivot_data(year, month)
        return jsonify(report_data)
    except ValueError:
        return jsonify({"error": "Geçersiz ay formatı. YYYY-AA formatında olmalı."}), 400
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Rapor oluşturulurken beklenmedik bir hata oluştu: {str(e)}"}), 500
    

