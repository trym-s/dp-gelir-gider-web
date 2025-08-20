
# app/income/routes.py
import io
import re
import json
import pandas as pd
from datetime import datetime, timedelta
from decimal import Decimal

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required

from marshmallow import ValidationError
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app import db
from app.errors import AppError
from app.auth import permission_required
from app.logging_utils import route_logger, dinfo, dwarn, derr, dinfo_sampled

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


income_bp = Blueprint("income_api", __name__, url_prefix="/api")

# ---------------------------------------------------------------------
# Services & Schemas
# ---------------------------------------------------------------------
income_service = IncomeService()
receipt_service = IncomeReceiptService()
customer_service = CustomerService

income_schema = IncomeSchema()
incomes_schema = IncomeSchema(many=True)
income_update_schema = IncomeUpdateSchema()

customer_schema = CustomerSchema()
customers_schema = CustomerSchema(many=True)
receipt_schema = IncomeReceiptSchema()
receipts_schema = IncomeReceiptSchema(many=True)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def _require_json():
    data = request.get_json(silent=True)
    if data is None:
        raise AppError("Request body must be JSON.", 400)
    return data

def _parse_month_param(month_param: str) -> tuple[int, int, datetime, datetime]:
    if not month_param:
        raise AppError("Query param 'month' is required (YYYY-MM).", 400)
    try:
        year, month = map(int, month_param.split("-"))
        start_date = datetime(year, month, 1).date()
        end_date = (datetime(year + (month // 12), ((month % 12) + 1), 1).date()
                    - timedelta(days=1))
        return year, month, start_date, end_date
    except Exception:
        raise AppError("Invalid 'month' format. Expected YYYY-MM.", 400)


# =====================================================================
#                         Customer (Company) Routes
# =====================================================================

@income_bp.route("/customers", methods=["POST"])
@jwt_required()
@permission_required("income:create")
@route_logger
def create_customer():
    data = _require_json()
    try:
        payload = customer_schema.load(data)
        new_customer = customer_service.create(payload)
        dinfo("customer.create", name=new_customer.name, id=new_customer.id)
        return jsonify(customer_schema.dump(new_customer)), 201
    except (ValidationError, AppError) as e:
        # Validation/AppError -> 4xx
        raise
    except Exception as e:
        derr("customer.create.unhandled", err=e)
        raise


@income_bp.route("/customers", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def get_all_customers():
    rows = customer_service.get_all()
    # GET çağrılarını seyrek bilgi loglayalım (sampling)
    dinfo_sampled("customer.list", count=len(rows))
    return jsonify(customers_schema.dump(rows)), 200


@income_bp.route("/customers/<int:customer_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
@permission_required("income:update")
@route_logger
def handle_customer(customer_id):
    if request.method == "GET":
        obj = customer_service.get_by_id(customer_id)
        return jsonify(customer_schema.dump(obj)), 200

    if request.method == "PUT":
        data = _require_json()
        payload = customer_schema.load(data, partial=True)
        updated = customer_service.update(customer_id, payload)
        dinfo("customer.update", id=customer_id)
        return jsonify(customer_schema.dump(updated)), 200

    # DELETE
    customer_service.delete(customer_id)
    dinfo("customer.delete", id=customer_id)
    return "", 204


# =====================================================================
#                               Income Routes
# =====================================================================

@income_bp.route("/incomes", methods=["POST"])
@jwt_required()
@permission_required("income:create")
@route_logger
def create_income():
    data = _require_json()
    schema = IncomeSchema(session=db.session)
    try:
        # Şema ile model oluştur
        new_income = schema.load(data)
        # Servis içinde iş kuralı/yan etkiler varsa çalışsın
        income_service.create(new_income)
        db.session.add(new_income)
        db.session.commit()
        dinfo("income.create", id=new_income.id, invoice=new_income.invoice_number)
        return jsonify(income_schema.dump(new_income)), 201
    except (ValidationError, AppError):
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("income.create.unhandled", err=e)
        raise


@income_bp.route("/incomes", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def get_all_incomes():
    filters = request.args.to_dict()
    try:
        page = int(filters.pop("page", 1))
        per_page = int(filters.pop("per_page", 20))
    except ValueError:
        raise AppError("page and per_page must be integers.", 400)

    sort_by = filters.pop("sort_by", "issue_date")
    sort_order = filters.pop("sort_order", "desc")

    paginated = income_service.get_all(
        filters=filters,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    dinfo_sampled("income.list", total=paginated.total, page=page, per_page=per_page)
    return jsonify({
        "data": incomes_schema.dump(paginated.items),
        "pagination": {
            "total_pages": paginated.pages,
            "total_items": paginated.total,
            "current_page": paginated.page,
        },
    }), 200


@income_bp.route("/incomes/<int:income_id>", methods=["GET", "PUT", "DELETE"], strict_slashes=False)
@jwt_required()
@route_logger
def handle_income(income_id):
    income = income_service.get_by_id(income_id)

    if request.method == "GET":
        return jsonify(income_schema.dump(income)), 200

    if request.method == "PUT":
        data = _require_json()

        # Numerik alanları güvenli biçimde Decimal'e dönüştür
        for field in ("total_amount", "received_amount"):
            if field in data and data[field] is not None:
                try:
                    data[field] = Decimal(str(data[field]))
                except (ValueError, TypeError):
                    raise AppError(f"Invalid numeric value for '{field}'.", 400)

        schema = IncomeUpdateSchema(session=db.session)
        updated_income = schema.load(data, instance=income, partial=True)
        db.session.commit()
        dinfo("income.update", id=income_id)
        return jsonify(income_schema.dump(updated_income)), 200

    # DELETE
    db.session.delete(income)
    db.session.commit()
    dinfo("income.delete", id=income_id)
    return "", 204


# =====================================================================
#                           Income Receipt Routes
# =====================================================================

@income_bp.route("/incomes/<int:income_id>/receipts", methods=["POST"])
@jwt_required()
@permission_required("income:create")
@route_logger
def create_receipt_for_income(income_id):
    data = _require_json()
    # URL’de geldiği için body’den varsa temizle
    data.pop("income_id", None)

    schema = IncomeReceiptSchema(session=db.session)
    try:
        receipt_obj = schema.load(data)
        updated_income = receipt_service.create(income_id, receipt_obj)
        dinfo("receipt.create", income_id=income_id)
        return jsonify(income_schema.dump(updated_income)), 201
    except (ValidationError, AppError):
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("receipt.create.unhandled", err=e, income_id=income_id)
        raise


@income_bp.route("/incomes/<int:income_id>/receipts", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def get_receipts_for_income(income_id):
    inc = income_service.get_by_id(income_id)
    rows = receipts_schema.dump(inc.receipts)
    dinfo_sampled("receipt.list", income_id=income_id, count=len(rows))
    return jsonify(rows), 200


@income_bp.route("/receipts/<int:receipt_id>", methods=["PUT"])
@jwt_required()
@permission_required("income:update")
@route_logger
def update_receipt(receipt_id):
    data = _require_json()
    if "receipt_amount" in data and data["receipt_amount"] is not None:
        try:
            data["receipt_amount"] = Decimal(str(data["receipt_amount"]))
        except (ValueError, TypeError):
            raise AppError("Invalid numeric value for 'receipt_amount'.", 400)

    schema = IncomeReceiptSchema(session=db.session)
    try:
        payload = schema.load(data, partial=True)
        updated = receipt_service.update(receipt_id, payload)
        dinfo("receipt.update", id=receipt_id, income_id=getattr(updated, "income_id", None))
        return jsonify(receipt_schema.dump(updated)), 200
    except (ValidationError, AppError):
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("receipt.update.unhandled", err=e, receipt_id=receipt_id)
        raise


@income_bp.route("/receipts/<int:receipt_id>", methods=["DELETE"])
@jwt_required()
@permission_required("income:delete")
@route_logger
def delete_receipt(receipt_id):
    try:
        receipt_service.delete(receipt_id)
        db.session.commit()
        dinfo("receipt.delete", id=receipt_id)
        return "", 204
    except AppError:
        db.session.rollback()
        raise
    except Exception as e:
        db.session.rollback()
        derr("receipt.delete.unhandled", err=e, receipt_id=receipt_id)
        raise


# =====================================================================
#                              Pivot / Excel
# =====================================================================

@income_bp.route("/incomes/pivot", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def get_income_pivot():
    year, month, start_date, end_date = _parse_month_param(request.args.get("month"))

    rows = (
        db.session.query(
            Income.issue_date.label("date"),
            Income.total_amount.label("amount"),
            BudgetItem.name.label("budget_item_name"),
            Customer.name.label("company_name"),
            Income.invoice_name.label("description"),
        )
        .join(Income.customer)
        .join(Income.budget_item)
        .filter(Income.issue_date.between(start_date, end_date))
        .all()
    )

    data = [{
        "date": r.date.isoformat() if r.date else None,
        "amount": float(r.amount) if r.amount is not None else 0.0,
        "budget_item_name": r.budget_item_name,
        "company_name": r.company_name,
        "description": r.description,
    } for r in rows]

    dinfo("income.pivot.built", month=f"{year:04d}-{month:02d}", rows=len(data))
    return jsonify(data), 200


# =====================================================================
#                    Import (validated) & Upload helpers
# =====================================================================

@income_bp.route("/incomes/upload", methods=["POST"])
@jwt_required()
@permission_required("income:create")
@route_logger
def upload_incomes():
    if "file" not in request.files:
        raise AppError("No file found in request (field: 'file').", 400)

    try:
        df = pd.read_excel(request.files["file"], sheet_name="Satış Faturaları", dtype=str).fillna("")
        df.columns = [str(c).strip() for c in df.columns]

        header_map = {
            "Düzenleme tarihi": "issue_date",
            "Müşteri": "customer_name",
            "Fatura ismi": "invoice_name",
            "Fatura sıra": "invoice_number",
            "Müşteri vergi numarası": "tax_number",
            "Genel Toplam": "total_amount",
            "Toplam KDV": "total_kdv",
            "Son tahsilat tarihi": "due_date",
        }
        df.rename(columns=header_map, inplace=True)

        def get_ids_for_region(region_name):
            ids = {"region_id": None, "sla_id": None, "dba_id": None, "bi_id": None}
            region = Region.query.filter_by(name=region_name).first()
            if not region:
                return ids
            ids["region_id"] = region.id

            sla_account = (
                AccountName.query.join(PaymentType)
                .filter(AccountName.name == "SLA", PaymentType.name == "Genel", PaymentType.region_id == region.id)
                .first()
            )
            if not sla_account:
                return ids

            ids["sla_id"] = sla_account.id
            dba_item = BudgetItem.query.filter_by(name="DBA", account_name_id=sla_account.id).first()
            if dba_item:
                ids["dba_id"] = dba_item.id
            bi_item = BudgetItem.query.filter_by(name="BI", account_name_id=sla_account.id).first()
            if bi_item:
                ids["bi_id"] = bi_item.id
            return ids

        id_sets = {
            "Teknopark": get_ids_for_region("Teknopark"),
            "DP Merkez": get_ids_for_region("DP Merkez"),
        }

        existing_invoice_numbers = {num for (num,) in db.session.execute(select(Income.invoice_number)).all()}
        existing_customers = {c.name.lower().strip(): c.id for c in Customer.query.all()}

        results = []
        for idx, row in df.iterrows():
            row_data = row.to_dict()
            errors = {}
            status = "invalid"

            if not row_data.get("customer_name"):
                continue

            invoice_name_lower = str(row_data.get("invoice_name", "")).lower()

            # KDV=0 → Teknopark; aksi halde DP Merkez
            try:
                kdv_value = float(str(row_data.get("total_kdv", "1")).replace(",", "."))
                chosen = id_sets["Teknopark"] if kdv_value == 0 else id_sets["DP Merkez"]
            except Exception:
                chosen = id_sets["DP Merkez"]

            row_data["region_id"] = chosen["region_id"]

            if "sql" in invoice_name_lower and chosen.get("dba_id"):
                row_data["budget_item_id"] = chosen["dba_id"]
            if "sla" in invoice_name_lower and chosen.get("sla_id"):
                row_data["account_name_id"] = chosen["sla_id"]
            if "dvh" in invoice_name_lower and chosen.get("bi_id"):
                row_data["budget_item_id"] = chosen["bi_id"]

            inv_no = row_data.get("invoice_number")
            if not inv_no or inv_no in existing_invoice_numbers:
                errors["invoice_number"] = "Fatura numarası boş veya mevcut."
                status = "duplicate"

            cname = row_data.get("customer_name", "").strip()
            cid = existing_customers.get(cname.lower())
            row_data["customer_id"] = cid
            row_data["is_new_customer"] = cid is None and bool(cname)

            results.append({"row": idx + 2, "data": row_data, "status": status, "errors": errors})

        dinfo("income.upload.preview_built", rows=len(results))
        return jsonify(results), 200

    except AppError:
        raise
    except Exception as e:
        derr("income.upload.unhandled", err=e)
        raise


@income_bp.route("/incomes/import-validated", methods=["POST"])
@jwt_required()
@permission_required("income:create")
@route_logger
def import_validated_incomes():
    data = _require_json()
    rows_to_process = data.get("corrected_rows", [])
    if not rows_to_process:
        raise AppError("No rows to import.", 400)

    successful_count = 0
    failed = []

    try:
        for row in rows_to_process:
            try:
                # --- Customer resolve/create ---
                cname = (row.get("customer_name") or "").strip()
                tno = (row.get("tax_number") or "").strip()
                if not cname:
                    raise AppError("Customer name cannot be empty.", 400)

                customer = None
                if tno:
                    customer = Customer.query.filter_by(tax_number=tno).first()
                if not customer and cname:
                    customer = Customer.query.filter(Customer.name.ilike(cname)).first()
                if not customer:
                    customer = Customer(name=cname, tax_number=tno or None)
                    db.session.add(customer)
                    db.session.flush()

                # --- Dates & amount ---
                issue_date = pd.to_datetime(row.get("issue_date"), errors="coerce")
                if pd.isna(issue_date):
                    raise AppError("Invalid issue_date.", 400)
                issue_date_str = issue_date.strftime("%Y-%m-%d")

                due_date = pd.to_datetime(row.get("due_date"), errors="coerce")
                due_date_str = due_date.strftime("%Y-%m-%d") if pd.notna(due_date) else None

                amount_str = re.sub(r"[^\d.]", "", str(row.get("total_amount", "0")))
                total_amount = Decimal(amount_str or "0")

                income = Income(
                    invoice_name=row.get("invoice_name"),
                    invoice_number=row.get("invoice_number"),
                    total_amount=total_amount,
                    issue_date=issue_date_str,
                    due_date=due_date_str,
                    customer_id=customer.id,
                    region_id=row.get("region_id"),
                    account_name_id=row.get("account_name_id"),
                    budget_item_id=row.get("budget_item_id"),
                    currency=row.get("currency", "TRY"),
                )
                db.session.add(income)
                db.session.flush()
                successful_count += 1

            except IntegrityError:
                db.session.rollback()
                failed.append({
                    "invoice_name": row.get("invoice_name"),
                    "error": "Duplicate invoice number."
                })
            except AppError as ae:
                db.session.rollback()
                failed.append({"invoice_name": row.get("invoice_name"), "error": ae.message})
            except Exception as e:
                db.session.rollback()
                failed.append({"invoice_name": row.get("invoice_name"), "error": str(e)})

        db.session.commit()
        dinfo("income.import_validated.done", ok=successful_count, fail=len(failed))
        return jsonify({
            "message": "Import finished.",
            "successful_count": successful_count,
            "failures": failed
        }), 200

    except Exception as e:
        db.session.rollback()
        derr("income.import_validated.unhandled", err=e)
        raise


@income_bp.route("/incomes/upload-dubai", methods=["POST"])
@jwt_required()
@permission_required("income:create")
@route_logger
def upload_dubai_incomes():
    if "file" not in request.files:
        raise AppError("No file found in request (field: 'file').", 400)

    try:
        df = pd.read_excel(request.files["file"], sheet_name="Invoices", dtype=str).fillna("")
        df.columns = [str(c).strip() for c in df.columns]

        header_map = {
            "INVOICE_ID": "invoice_number",
            "Date": "issue_date",
            "Invoice#": "invoice_name",
            "Customer Name": "customer_name",
            "Amount": "total_amount",
            "Due Date": "due_date",
        }
        df.rename(columns=header_map, inplace=True)

        region = Region.query.filter_by(name="Dubai").first()
        if not region:
            raise AppError("Region 'Dubai' not found.", 404)

        existing_invoice_numbers = {num for (num,) in db.session.execute(select(Income.invoice_number)).all()}
        existing_customers = {c.name.strip().casefold(): c for c in Customer.query.all()}

        # Dummy VKN serisi
        last_dummy = (
            db.session.query(func.max(Customer.tax_number))
            .filter(Customer.tax_number.like("DBI-%"))
            .scalar()
        )
        counter = int(last_dummy.split("-")[1]) + 1 if last_dummy else 1

        results = []
        new_dummy_map = {}

        for idx, row in df.iterrows():
            rd = row.to_dict()
            errors = {}
            status = "invalid"

            rd["region_id"] = region.id
            rd["account_name_id"] = None
            rd["budget_item_id"] = None
            rd["currency"] = "USD"

            cname = (rd.get("customer_name") or "").strip()
            key = cname.casefold()
            existing = existing_customers.get(key)

            if existing:
                rd["customer_id"] = existing.id
                rd["is_new_customer"] = False
                rd["tax_number"] = existing.tax_number
            else:
                rd["customer_id"] = None
                rd["is_new_customer"] = True
                if key not in new_dummy_map:
                    new_dummy_map[key] = f"DBI-{counter:06d}"
                    counter += 1
                rd["tax_number"] = new_dummy_map[key]

            inv = rd.get("invoice_number")
            if not inv or inv in existing_invoice_numbers:
                errors["invoice_number"] = "Invoice number missing or already exists."
                status = "duplicate"

            results.append({"row": idx + 2, "data": rd, "status": status, "errors": errors})

        dinfo("income.upload_dubai.preview_built", rows=len(results))
        return jsonify(results), 200

    except AppError:
        raise
    except Exception as e:
        derr("income.upload_dubai.unhandled", err=e)
        raise


# =====================================================================
#                         Export / Template Download
# =====================================================================

@income_bp.route("/incomes/download-template", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def download_income_template():
    try:
        filters = request.args.to_dict()
        incomes = income_service.get_all_filtered(filters=filters)
        if not incomes:
            raise AppError("No data to export.", 404)

        rows = []
        for inc in incomes:
            rows.append({
                "Fatura No": inc.invoice_number,
                "Fatura İsmi": inc.invoice_name,
                "Müşteri": inc.customer.name if inc.customer else "",
                "Vergi Numarası": inc.customer.tax_number if inc.customer and inc.customer.tax_number else "",
                "Toplam Tutar": float(inc.total_amount),
                "Tahsil Edilen": float(inc.received_amount),
                "Durum": inc.status.name if inc.status else "",
                "Ödeme Zamanlaması": inc.timeliness_status.name if inc.timeliness_status else "",
                "Düzenleme Tarihi": inc.issue_date.strftime("%d.%m.%Y") if inc.issue_date else "",
                "Vade Tarihi": inc.due_date.strftime("%d.%m.%Y") if inc.due_date else "",
            })

        df = pd.DataFrame(rows)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Gelirler")
        output.seek(0)

        dinfo("income.download_template.ready", rows=len(rows))
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"gelirler_raporu_{datetime.now().strftime('%Y-%m-%d')}.xlsx",
        )

    except AppError:
        raise
    except Exception as e:
        derr("income.download_template.unhandled", err=e)
        raise


@income_bp.route("/incomes/export", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def export_incomes():
    try:
        filters = request.args.to_dict()
        incomes = income_service.get_all_filtered(filters=filters)
        if not incomes:
            raise AppError("No data to export.", 404)

        data = []
        for inc in incomes:
            data.append({
                "Fatura No": inc.invoice_number,
                "Fatura İsmi": inc.invoice_name,
                "Müşteri": inc.customer.name if inc.customer else "",
                "Vergi Numarası": inc.customer.tax_number if inc.customer and inc.customer.tax_number else "",
                "Toplam Tutar": float(inc.total_amount),
                "Tahsil Edilen": float(inc.received_amount),
                "Durum": inc.status.name if inc.status else "",
                "Ödeme Zamanlaması": inc.timeliness_status.name if inc.timeliness_status else "",
                "Düzenleme Tarihi": inc.issue_date.strftime("%d.%m.%Y") if inc.issue_date else "",
                "Vade Tarihi": inc.due_date.strftime("%d.%m.%Y") if inc.due_date else "",
            })

        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Gelirler")
        output.seek(0)

        dinfo("income.export.ready", rows=len(data))
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"gelirler_raporu_{datetime.now().strftime('%Y-%m-%d')}.xlsx",
        )

    except AppError:
        raise
    except Exception as e:
        derr("income.export.unhandled", err=e)
        raise


# =====================================================================
#                            Monthly Collections
# =====================================================================

@income_bp.route("/monthly_collections_report", methods=["GET"])
@jwt_required()
@permission_required("income:read")
@route_logger
def get_monthly_collections_data():
    month_param = request.args.get("month")
    try:
        year, month, _, _ = _parse_month_param(month_param)
        report = income_service.get_report_pivot_data(year, month)
        dinfo("income.monthly_collections_report", month=f"{year:04d}-{month:02d}", rows=len(report or []))
        return jsonify(report), 200
    except AppError:
        raise
    except Exception as e:
        derr("income.monthly_collections.unhandled", err=e)
        raise

