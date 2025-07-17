from flask import Blueprint, request, jsonify
from app.expense.services import get_all, create, update, delete,     create_expense_group_with_expenses, get_by_id
from app.expense.schemas import ExpenseSchema, ExpenseGroupSchema
from app import db
from app.payments.services import PaymentService
from app.payments.schemas import PaymentSchema
import pandas as pd
import io
from flask import send_file
from werkzeug.utils import secure_filename
from app.expense.services import create
from app.models import db, Expense
from datetime import datetime
from marshmallow import ValidationError
from decimal import Decimal

expense_bp = Blueprint('expense_api', __name__, url_prefix='/api/expenses')
payment_service = PaymentService()

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
        expense = schema.load(data)
        new_expense = create(expense)
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
        return {"message": "group_name, repeat_count, and expense_template_data are required."},400

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
        from app.models import Expense, Region, BudgetItem

        month_str = request.args.get("month")
        if not month_str:
            return jsonify({"error": "Month parameter is required"}), 400

        year, month = map(int, month_str.split("-"))
        start_date = datetime(year, month, 1)
        end_date = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        query = (
            db.session.query(
                Expense.id,
                Expense.date,
                Expense.amount,
                Expense.description,
                Region.id.label("region_id"),
                Region.name.label("region_name"),
                BudgetItem.id.label("budget_item_id"),
                BudgetItem.name.label("budget_item_name")
            )
            .join(Region, Region.id == Expense.region_id)
            .join(BudgetItem, BudgetItem.id == Expense.budget_item_id)
            .filter(Expense.date >= start_date, Expense.date < end_date)
        )

        results = query.all()

        data = []
        for row in results:
            data.append({
                "id": row.id,
                "date": row.date.strftime("%Y-%m-%d"),
                "day": row.date.day,
                "description": row.description,
                "amount": float(row.amount),
                "budget_item_id": row.budget_item_id,
                "budget_item_name": row.budget_item_name,
                "region_id": row.region_id,
                "region_name": row.region_name,
            })

        return jsonify(data), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@expense_bp.route("/template", methods=["GET"])    
def download_expense_template():
    columns = ["Açıklama", "Bölge", "Ödeme Türü", "Hesap Adı", "Bütçe Kalemi", "Tutar", "Tarih"]
    df = pd.DataFrame(columns=columns)
    output = io.BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)
    return send_file(output, download_name="gider_taslak.xlsx", as_attachment=True, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

# --- Taslak Yükle (Excel Import) ---
@expense_bp.route("/import", methods=["POST"])
def import_expense_template():
    from app.models import Region, PaymentType, AccountName, BudgetItem

    if 'file' not in request.files:
        return jsonify({"error": "Dosya yüklenmedi"}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    if not filename.endswith(('.xlsx', '.xls')):
        return jsonify({"error": "Yalnızca Excel dosyası yükleyebilirsiniz"}), 400

    # Excel başlıklarından backend fieldlara mapping
    excel_to_db = {
        "Açıklama": "description",
        "Bölge": "region_name",
        "Ödeme Türü": "payment_type_name",
        "Hesap Adı": "account_name_name",
        "Bütçe Kalemi": "budget_item_name",
        "Tutar": "amount",
        "Tarih": "date"
    }

    # Sadece bunlar olsun! Kalan Tutar yok!
    required_cols = [
        "description",
        "amount",
        "date",
        "region_name",
        "payment_type_name",
        "account_name_name",
        "budget_item_name"
    ]

    id_map_models = {
        "region_name": Region,
        "payment_type_name": PaymentType,
        "account_name_name": AccountName,
        "budget_item_name": BudgetItem,
    }
    id_fields = {
        "region_name": "region_id",
        "payment_type_name": "payment_type_id",
        "account_name_name": "account_name_id",
        "budget_item_name": "budget_item_id"
    }

    try:
        df = pd.read_excel(file)
        df = df.rename(columns=excel_to_db)
    except Exception as e:
        return jsonify({"error": "Excel okunamadı", "details": str(e)}), 400

    # Sadece gerekli sütunlar var mı kontrolü
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        return jsonify({"error": f"Şu sütunlar eksik: {', '.join(missing_cols)}"}), 400

    # Türkçe isimlerden id'ye çevir
    for name_col, model in id_map_models.items():
        name_to_id = {getattr(obj, "name"): obj.id for obj in model.query.all()}
        df[id_fields[name_col]] = df[name_col].map(name_to_id)
        # Eşleşmeyen satırlara özel hata
        if df[id_fields[name_col]].isnull().any():
            hata_satirlari = df[df[id_fields[name_col]].isnull()].index + 2
            hatali_degerler = df.loc[df[id_fields[name_col]].isnull(), name_col].tolist()
            return jsonify({
                "error": f"Şu satırlarda geçersiz veya eksik {name_col.replace('_name','')}: " +
                         ", ".join([f"{satir}: {deger}" for satir, deger in zip(hata_satirlari, hatali_degerler)])
            }), 400

    final_required_cols = [
        "description",
        "amount",
        "date",
        "region_id",
        "payment_type_id",
        "account_name_id",
        "budget_item_id"
    ]

    error_rows = []
    success_rows = []
    seen_rows = set()

    for idx, row in df.iterrows():
        row_errors = []
        row_data = {}

        # Eksik kontrolü
        for col in final_required_cols:
            val = row.get(col)
            if pd.isnull(val) or (isinstance(val, str) and not str(val).strip()):
                row_errors.append(f"{col} boş bırakılamaz")
            else:
                row_data[col] = val

        # Tip kontrolü
        try:
            amount = float(row_data.get("amount", 0))
            if amount <= 0:
                row_errors.append("amount pozitif olmalı")
        except Exception:
            row_errors.append("amount sayısal olmalı")

        try:
            date_val = pd.to_datetime(row_data.get("date", ""), errors="raise")
            row_data["date"] = date_val.date()
        except Exception:
            row_errors.append("date geçerli bir tarih olmalı (YYYY-MM-DD)")

        # Duplikasyon kontrolü (aynı description, tarih, amount bir arada birden fazla ise)
        row_tuple = tuple([row_data.get(col, None) for col in final_required_cols])
        if row_tuple in seen_rows:
            row_errors.append("Bu satır duplike (aynı veriler daha önce girilmiş)")
        else:
            seen_rows.add(row_tuple)

        if row_errors:
            error_rows.append({"row": idx + 2, "errors": row_errors})
            continue

        # Doğru ise DB'ye kaydet (KALAN TUTAR = TUTAR!)
        try:
            expense_obj = Expense(
                description=row_data["description"],
                amount=amount,
                date=row_data["date"],
                region_id=int(row_data["region_id"]),
                payment_type_id=int(row_data["payment_type_id"]),
                account_name_id=int(row_data["account_name_id"]),
                budget_item_id=int(row_data["budget_item_id"]),
                remaining_amount=amount,  # <-- Kalan Tutar burada her zaman Tutar ile aynı başlar!
                status="UNPAID"
            )
            db.session.add(expense_obj)
            db.session.flush()
            success_rows.append({"row": idx + 2, "id": expense_obj.id})
        except Exception as e:
            db.session.rollback()
            error_rows.append({"row": idx + 2, "errors": [str(e)]})

    db.session.commit()
    return jsonify({"success_rows": success_rows, "error_rows": error_rows}), 200

@expense_bp.route("/upload", methods=["POST"])
def upload_expenses():
    if 'file' not in request.files:
        return jsonify({"message": "Dosya bulunamadı"}), 400

    file = request.files['file']
    
    # Dosya uzantısını kontrol et
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"message": "Geçersiz dosya formatı. Lütfen .xlsx veya .xls uzantılı bir dosya yükleyin."}), 400

    try:
        df = pd.read_excel(file)
        # Sütun isimlerini modelinizle eşleşecek şekilde düzenleyin (örn: 'Tutar' -> 'amount')
        df.rename(columns={"Açıklama": "description", "Tutar": "amount", "Tarih": "date"}, inplace=True)

        results = []
        schema = ExpenseSchema(session=db.session) # session'ı şemaya geçmek önemli

        for index, row in df.iterrows():
            row_data = row.to_dict()
            try:
                # Her satırı Marshmallow şeması ile doğrula
                schema.load(row_data)
                results.append({"row": index + 2, "data": row_data, "status": "valid"})
            except ValidationError as err:
                # Hata varsa, hatayı ve satır bilgisini kaydet
                results.append({"row": index + 2, "data": row_data, "status": "invalid", "errors": err.messages})
        
        return jsonify(results), 200

    except Exception as e:
        return jsonify({"message": f"Dosya işlenirken bir hata oluştu: {str(e)}"}), 500

@expense_bp.route("/import-validated", methods=["POST"])
def import_validated_data():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Veri bulunamadı"}), 400

    valid_rows = data.get('valid_rows', [])
    corrected_rows = data.get('corrected_rows', [])
    
    expenses_to_create = []
    
    # Hem başlangıçta geçerli olanları hem de düzeltilenleri tek bir listede topla
    all_rows = valid_rows + corrected_rows
    
    for row_data in all_rows:
        # Gerekli alanların varlığını ve tür dönüşümlerini kontrol et
        try:
            # Frontend'den gelen string 'amount' değerini Decimal'e çevir
            row_data['amount'] = Decimal(row_data['amount'])
            # Kalan tutarı başlangıçta ana tutara eşitle
            row_data['remaining_amount'] = row_data['amount']
            
            # 'key' ve 'errors' gibi frontend'e özel alanları kaldır
            row_data.pop('key', None)
            row_data.pop('errors', None)

            expense = Expense(**row_data)
            expenses_to_create.append(expense)
        except (TypeError, KeyError, ValueError) as e:
            # Bir hata oluşursa işlemi durdur ve hata bildir
            db.session.rollback()
            return jsonify({"message": f"Hatalı veri yapısı: {row_data}. Hata: {e}"}), 400

    try:
        # Toplu kayıt işlemi için "bulk_save_objects" kullanarak verimliliği artırın
        db.session.bulk_save_objects(expenses_to_create)
        db.session.commit()
        return jsonify({"message": f"{len(expenses_to_create)} adet gider başarıyla içe aktarıldı."}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Veritabanı kaydı sırasında hata: {str(e)}"}), 500
    
@expense_bp.route("/download-template", methods=['GET'])
def download_template():
    # Excel şablonunda olmasını istediğiniz başlıklar
    headers = [
        'description', 'amount', 'date', 'region_id', 
        'payment_type_id', 'account_name_id', 'budget_item_id'
    ]
    df = pd.DataFrame(columns=headers)

    # DataFrame'i hafızada bir Excel dosyasına dönüştür
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Giderler')
    output.seek(0)

    # Dosyayı kullanıcıya gönder
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='gider_taslak.xlsx'
    )    