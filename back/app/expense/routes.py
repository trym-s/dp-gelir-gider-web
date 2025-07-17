from flask import Blueprint, request, jsonify, send_file
from marshmallow import ValidationError
from decimal import Decimal
import pandas as pd
import io

# App ve Model importları
from app import db
from app.models import Expense, Region, PaymentType, AccountName, BudgetItem

# Schema ve Servis importları
from app.expense.schemas import ExpenseSchema, ExpenseGroupSchema
from app.expense.services import get_all, create, update, delete, create_expense_group_with_expenses, get_by_id
from app.payments.services import PaymentService
from app.payments.schemas import PaymentSchema


# Blueprint tanımı
expense_bp = Blueprint('expense_api', __name__, url_prefix='/api/expenses')
payment_service = PaymentService()

# ===================================================================
# === STANDART CRUD, LİSTELEME VE PİVOT İŞLEMLERİ (MEVCUT KODUNUZ) ===
# ===================================================================

@expense_bp.route("/", methods=["GET"], strict_slashes=False)
def list_expenses():
    try:
        filters = {k: v for k, v in request.args.items() if v is not None}
        page = int(filters.pop('page', 1))
        per_page = int(filters.pop('per_page', 20))
        sort_by = filters.pop('sort_by', 'date')
        sort_order = filters.pop('sort_order', 'desc')
        
        paginated_expenses = get_all(
            filters=filters, 
            sort_by=sort_by, 
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )
        
        schema = ExpenseSchema(many=True)
        return jsonify({
            "data": schema.dump(paginated_expenses.items),
            "pagination": {
                "total_pages": paginated_expenses.pages,
                "total_items": paginated_expenses.total,
                "current_page": paginated_expenses.page
            }
        }), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

@expense_bp.route("/<int:expense_id>", methods=["GET"])
def get_single_expense(expense_id):
    expense = get_by_id(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404
    schema = ExpenseSchema()
    return jsonify(schema.dump(expense)), 200

@expense_bp.route("/", methods=["POST"])
def add_expense():
    data = request.get_json()
    schema = ExpenseSchema(session=db.session)
    try:
        validated_data = schema.load(data)
        new_expense = create(validated_data)
        return schema.dump(new_expense), 201
    except Exception as e:
        return {"message": str(e)}, 400

@expense_bp.route("/expense-groups", methods=["POST"])
def add_expense_group_with_expenses():
    data = request.get_json()
    group_name = data.get("group_name")
    repeat_count = data.get("repeat_count")
    expense_template_data = data.get("expense_template_data")

    if not group_name or not repeat_count or not expense_template_data:
        return {"message": "group_name, repeat_count, and expense_template_data are required."}, 400

    try:
        result = create_expense_group_with_expenses(group_name, expense_template_data, repeat_count)
        group_schema = ExpenseGroupSchema()
        expense_schema = ExpenseSchema(many=True)
        response = {
            "expense_group": group_schema.dump(result["expense_group"]),
            "expenses": expense_schema.dump(result["expenses"])
        }
        return jsonify(response), 201
    except Exception as e:
        db.session.rollback()
        return {"message": str(e)}, 500

@expense_bp.route("/<int:expense_id>", methods=["PUT"])
def edit_expense(expense_id):
    data = request.get_json()
    try:
        updated_expense = update(expense_id, data)
        if not updated_expense:
            return jsonify({"message": "Expense not found"}), 404
        
        schema = ExpenseSchema()
        return jsonify(schema.dump(updated_expense)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

@expense_bp.route("/<int:expense_id>", methods=["DELETE"])
def remove_expense(expense_id):
    expense = delete(expense_id)
    if not expense:
        return {"message": "Expense not found"}, 404
    return {"message": "Expense deleted"}, 200

@expense_bp.route("/<int:expense_id>/payments", methods=["POST"])
def add_payment_to_expense(expense_id):
    data = request.get_json()
    if not data or 'payment_amount' not in data or 'payment_date' not in data:
        return jsonify({"error": "Missing required payment information"}), 400

    try:
        payment = payment_service.create(expense_id, data)
        schema = PaymentSchema()
        return jsonify(schema.dump(payment)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@expense_bp.route('/pivot', methods=['GET'])
def get_expense_pivot():
    try:
        from datetime import datetime
        month_str = request.args.get("month")
        if not month_str:
            return jsonify({"error": "Month parameter is required"}), 400

        year, month = map(int, month_str.split("-"))
        start_date = datetime(year, month, 1)
        end_date = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        query = (
            db.session.query(
                Expense.id, Expense.date, Expense.amount, Expense.description,
                Region.id.label("region_id"), Region.name.label("region_name"),
                BudgetItem.id.label("budget_item_id"), BudgetItem.name.label("budget_item_name")
            )
            .join(Region, Region.id == Expense.region_id)
            .join(BudgetItem, BudgetItem.id == Expense.budget_item_id)
            .filter(Expense.date >= start_date, Expense.date < end_date)
        )
        results = query.all()
        data = [
            {
                "id": row.id, "date": row.date.strftime("%Y-%m-%d"), "day": row.date.day,
                "description": row.description, "amount": float(row.amount),
                "budget_item_id": row.budget_item_id, "budget_item_name": row.budget_item_name,
                "region_id": row.region_id, "region_name": row.region_name,
            }
            for row in results
        ]
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ===============================================================
# === YENİ ve GÜNCEL EXCEL İLE TOPLU GİDER YÜKLEME İŞLEMLERİ ===
# ===============================================================

@expense_bp.route("/download-template", methods=['GET'])
def download_template():
    """
    Kullanıcı dostu, Türkçe başlıklara sahip bir Excel şablonu oluşturur ve gönderir.
    Kullanıcıdan ID yerine doğrudan isim girmesi beklenir.
    """
    header_map = {
        'description': 'Açıklama',
        'amount': 'Tutar',
        'date': 'Tarih (GG.AA.YYYY)',
        'region_name': 'Bölge',
        'payment_type_name': 'Ödeme Türü',
        'account_name_name': 'Hesap Adı',
        'budget_item_name': 'Bütçe Kalemi'
    }
    turkish_headers = list(header_map.values())
    df = pd.DataFrame(columns=turkish_headers)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Giderler')
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='gider_taslak.xlsx'
    )

@expense_bp.route("/upload", methods=["POST"])
def upload_expenses():
    """
    Yüklenen Excel dosyasını satır satır doğrular.
    BİR SATIRDAKİ HATA, TÜM İŞLEMİ DURDURMAZ.
    Her satırın sonucu (başarılı veya hatalı) toplanır ve rapor olarak döndürülür.
    """
    if 'file' not in request.files:
        return jsonify({"message": "Dosya bulunamadı"}), 400
    file = request.files['file']
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"message": "Geçersiz dosya formatı."}), 400

    try:
        df = pd.read_excel(file, dtype=str).fillna('')
        
        header_map = {
            'Açıklama': 'description', 'Tutar': 'amount', 'Tarih (GG.AA.YYYY)': 'date',
            'Bölge': 'region_name', 'Ödeme Türü': 'payment_type_name',
            'Hesap Adı': 'account_name_name', 'Bütçe Kalemi': 'budget_item_name'
        }
        df.rename(columns=header_map, inplace=True)
        
        # İlişkili modellerin isim-ID eşleşmelerini başta tek seferde çek
        regions = {r.name: r.id for r in Region.query.all()}
        payment_types = {p.name: p.id for p in PaymentType.query.all()}
        account_names = {a.name: a.id for a in AccountName.query.all()}
        budget_items = {b.name: b.id for b in BudgetItem.query.all()}
        name_fields = {
            'region_name': (regions, 'region_id'), 'payment_type_name': (payment_types, 'payment_type_id'),
            'account_name_name': (account_names, 'account_name_id'), 'budget_item_name': (budget_items, 'budget_item_id'),
        }

        results = []
        schema = ExpenseSchema(session=db.session, partial=True)

        for index, row in df.iterrows():
            errors = {}
            # Orijinal metin verisini kaybetmemek için kopyasını al
            original_row_data = row.to_dict()
            # İşlenecek veri bu kopya üzerinde olacak
            processed_data = row.to_dict()

            # === HER SATIR İÇİN GÜVENLİ BLOK ===
            # Bu blok sayesinde bir satırdaki hata diğerlerini etkilemez.
            try:
                # 1. Aşama: İsimleri ID'lere çevir
                for name_key, (id_map, id_key) in name_fields.items():
                    name_value = processed_data.get(name_key)
                    if name_value:
                        found_id = id_map.get(name_value)
                        if found_id:
                            processed_data[id_key] = found_id
                        else:
                            errors[id_key] = f"'{name_value}' adıyla bir kayıt bulunamadı."
                    processed_data.pop(name_key, None) # İşlenen _name alanını kaldır

                # 2. Aşama: Tarih ve Sayı gibi alanları doğrula
                # Tarih formatını ayarla
                date_str = processed_data.get('date')
                if date_str:
                     processed_data['date'] = pd.to_datetime(date_str, dayfirst=True).strftime('%Y-%m-%d')
                
                # Diğer alanları schema ile doğrula
                schema.load(processed_data)

            except ValidationError as err:
                errors.update(err.messages)
            except Exception as e:
                # Tarih formatı, sayıya çevirme gibi diğer tüm hataları yakala
                errors['general_error'] = f"Satır işlenemedi: {str(e)}"
            # === GÜVENLİ BLOK SONU ===

            if errors:
                results.append({"row": index + 2, "data": original_row_data, "status": "invalid", "errors": errors})
            else:
                results.append({"row": index + 2, "data": processed_data, "status": "valid"})
        
        return jsonify(results), 200

    except Exception as e:
        # Bu blok, dosya okuma veya başlıkları yeniden isimlendirme gibi genel hatalar içindir.
        return jsonify({"message": f"Dosya işlenirken genel bir hata oluştu: {str(e)}"}), 500


    
# back/app/expense/routes.py dosyasındaki /import-validated fonksiyonunun NİHAİ HALİ

@expense_bp.route("/import-validated", methods=["POST"])
def import_validated_data():
    """
    Frontend'den gelen veriyi alır. schema.load() ile Expense NESNESİ oluşturur,
    bu nesnenin özelliklerini günceller ve veritabanına toplu halde kaydeder.
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Veri bulunamadı"}), 400

    all_rows = data.get('valid_rows', []) + data.get('corrected_rows', [])
    
    expenses_to_create = []
    schema = ExpenseSchema(session=db.session)

    for row_data in all_rows:
        try:
            row_data.pop('key', None)
            row_data.pop('errors', None)
            
            # Tarih ve Tutar gibi alanları manuel olarak doğru tipe çevir
            if 'amount' in row_data:
                row_data['amount'] = Decimal(str(row_data['amount']).replace(',', '.'))
            if 'date' in row_data and isinstance(row_data['date'], str):
                row_data['date'] = pd.to_datetime(row_data['date'], dayfirst=True).strftime('%Y-%m-%d')

            # --- DÜZELTİLMİŞ MANTIK ---
            # 1. schema.load() ile bir Expense NESNESİ oluştur.
            expense_object = schema.load(row_data)

            # 2. Bu NESNENİN özelliklerini (attributes) doğrudan güncelle.
            expense_object.remaining_amount = expense_object.amount
            expense_object.status = "UNPAID"

            # 3. Güncellenmiş nesneyi listeye ekle.
            expenses_to_create.append(expense_object)
            # --- DÜZELTME SONU ---

        except (ValidationError, TypeError, ValueError, KeyError) as e:
            db.session.rollback()
            error_message = getattr(e, 'messages', str(e))
            return jsonify({
                "message": "İçe aktarma başarısız. Veri formatı hatalı.",
                "error_details": f"Hatalı Satır Açıklaması: {row_data.get('description', 'N/A')}, Hata: {error_message}"
            }), 400
            
    try:
        if expenses_to_create:
            db.session.bulk_save_objects(expenses_to_create)
            db.session.commit()
        return jsonify({"message": f"{len(expenses_to_create)} adet gider başarıyla içe aktarıldı."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Veritabanı kaydı sırasında genel bir hata oluştu: {str(e)}"}), 500