# app/loans/routes.py

import logging
from datetime import datetime
from decimal import Decimal

from flask import Blueprint, request, jsonify

from app.errors import AppError
from app.logging_utils import route_logger, dinfo_sampled, dwarn
from app import db

from .models import LoanPaymentType, LoanPayment
from .schemas import (
    loan_schema,
    loans_schema,
    loan_type_schema,
    loan_types_schema,
    loan_payments_schema,
    amortization_schedules_schema,
)
from .services import (
    get_all_loans,
    get_loan_by_id,
    create_loan,
    update_loan,
    delete_loan,
    get_loans_by_bank_id,
    get_all_loan_types,
    get_loan_type_by_id,
    create_loan_type,
    update_loan_type,
    delete_loan_type,
    get_payments_for_loan,
    make_payment,
    get_amortization_schedule_for_loan,
    get_loan_history,
)

loans_bp = Blueprint("loans_api", __name__, url_prefix="/api")


# -------------------------- Loans --------------------------

@loans_bp.route("/loans/by-bank/<int:bank_id>", methods=["GET"])
@route_logger
def get_loans_by_bank(bank_id: int):
    try:
        bank_account_id = request.args.get("bank_account_id", type=int)
        loans = get_loans_by_bank_id(bank_id, bank_account_id)
        dinfo_sampled("loans.by_bank", bank_id=bank_id, bank_account_id=bank_account_id, count=len(loans))
        return jsonify(loans_schema.dump(loans)), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception:
        logging.exception("loans.by_bank.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loans", methods=["GET"])
@route_logger
def get_loans():
    try:
        loans_query = get_all_loans()
        paid_loan_ids = {lid for (lid,) in db.session.query(LoanPayment.loan_id).distinct()}
        out = []
        for loan in loans_query:
            obj = loan_schema.dump(loan)
            obj["has_payments"] = loan.id in paid_loan_ids
            out.append(obj)
        dinfo_sampled("loans.list", count=len(out))
        return jsonify({"data": out}), 200
    except Exception:
        logging.exception("loans.list.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loans/<int:loan_id>", methods=["GET"])
@route_logger
def get_loan(loan_id: int):
    try:
        loan = get_loan_by_id(loan_id)
        if not loan:
            return jsonify({"error": "Kredi bulunamadı."}), 404
        return jsonify(loan_schema.dump(loan)), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception:
        logging.exception("loans.get.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loans", methods=["POST"])
@route_logger
def add_loan():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Geçerli bir JSON gövdesi gönderin."}), 400
    try:
        new_loan = create_loan(data)
        return jsonify(loan_schema.dump(new_loan)), 201
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except (ValueError, KeyError) as e:
        dwarn("loan.create.bad_request", reason=str(e))
        return jsonify({"error": str(e)}), 400
    except Exception:
        logging.exception("loan.create.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loans/<int:loan_id>", methods=["PUT"])
@route_logger
def edit_loan(loan_id: int):
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Geçerli bir JSON gövdesi gönderin."}), 400
    try:
        updated = update_loan(loan_id, data)
        if not updated:
            return jsonify({"error": "Kredi bulunamadı."}), 404
        return jsonify(loan_schema.dump(updated)), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception:
        logging.exception("loan.update.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loans/<int:loan_id>", methods=["DELETE"])
@route_logger
def remove_loan(loan_id: int):
    try:
        deleted = delete_loan(loan_id)
        if not deleted:
            return jsonify({"error": "Kredi bulunamadı."}), 404
        return jsonify({"message": "Kredi silindi."}), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception:
        logging.exception("loan.delete.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


# ---------------------- Amortization ----------------------

@loans_bp.route("/loans/<int:loan_id>/amortization-schedule", methods=["GET"])
@route_logger
def get_amortization_schedule(loan_id: int):
    try:
        schedule = get_amortization_schedule_for_loan(loan_id)
        return jsonify({"data": amortization_schedules_schema.dump(schedule)}), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception:
        logging.exception("loan.schedule.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


# ---------------------- Loan Types -----------------------

@loans_bp.route("/loan-types", methods=["GET"])
@route_logger
def get_loan_types():
    try:
        types_ = get_all_loan_types()
        dinfo_sampled("loan_types.list", count=len(types_))
        return jsonify({"data": loan_types_schema.dump(types_)}), 200
    except Exception:
        logging.exception("loan_types.list.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loan-types", methods=["POST"])
@route_logger
def add_loan_type():
    data = request.get_json(silent=True)
    if not data or "name" not in data:
        return jsonify({"error": "'name' zorunludur."}), 400
    try:
        lt = create_loan_type(data)
        return jsonify(loan_type_schema.dump(lt)), 201
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except Exception:
        logging.exception("loan_types.create.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loan-types/<int:loan_type_id>", methods=["GET"])
@route_logger
def get_loan_type(loan_type_id: int):
    try:
        lt = get_loan_type_by_id(loan_type_id)
        if not lt:
            return jsonify({"error": "Kredi türü bulunamadı."}), 404
        return jsonify(loan_type_schema.dump(lt)), 200
    except Exception:
        logging.exception("loan_types.get.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loan-types/<int:loan_type_id>", methods=["PUT"])
@route_logger
def edit_loan_type(loan_type_id: int):
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Geçerli bir JSON gövdesi gönderin."}), 400
    try:
        lt = update_loan_type(loan_type_id, data)
        if not lt:
            return jsonify({"error": "Kredi türü bulunamadı."}), 404
        return jsonify(loan_type_schema.dump(lt)), 200
    except Exception:
        logging.exception("loan_types.update.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loan-types/<int:loan_type_id>", methods=["DELETE"])
@route_logger
def remove_loan_type(loan_type_id: int):
    try:
        deleted = delete_loan_type(loan_type_id)
        if not deleted:
            return jsonify({"error": "Kredi türü bulunamadı."}), 404
        return jsonify({"message": "Kredi türü silindi."}), 200
    except Exception:
        logging.exception("loan_types.delete.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


# ---------------------- Payments -------------------------

@loans_bp.route("/loans/<int:loan_id>/payments", methods=["GET"])
@route_logger
def get_loan_payments(loan_id: int):
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        paginated = get_payments_for_loan(loan_id, page, per_page)
        if paginated is None:
            return jsonify({"error": "Kredi bulunamadı."}), 404
        dinfo_sampled("loan_payments.list", loan_id=loan_id, page=page, per_page=per_page, total=paginated.total)
        return jsonify({
            "data": loan_payments_schema.dump(paginated.items),
            "pagination": {
                "total_pages": paginated.pages,
                "total_items": paginated.total,
                "current_page": paginated.page
            }
        }), 200
    except Exception:
        logging.exception("loan_payments.list.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


@loans_bp.route("/loans/<int:loan_id>/payments", methods=["POST"])
@route_logger
def add_loan_payment(loan_id: int):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Geçerli bir JSON gövdesi gönderin."}), 400

    # Zorunlu alan kontrolleri
    missing = [k for k in ("amount_paid", "payment_date", "payment_type") if k not in data]
    if missing:
        return jsonify({"error": f"Eksik alan(lar): {', '.join(missing)}"}), 400

    try:
        amount_paid = Decimal(str(data["amount_paid"]))
    except Exception:
        return jsonify({"error": "amount_paid sayısal olmalıdır."}), 400

    try:
        payment_date = datetime.strptime(str(data["payment_date"]), "%Y-%m-%d").date()
    except Exception:
        return jsonify({"error": "payment_date YYYY-MM-DD formatında olmalıdır."}), 400

    payment_type_str = str(data["payment_type"])
    try:
        payment_type = LoanPaymentType[payment_type_str]
    except KeyError:
        return jsonify({"error": f"Geçersiz payment_type: {payment_type_str}"}), 400

    notes = data.get("notes")
    installment_id = data.get("installment_id")

    try:
        updated = make_payment(
            loan_id=loan_id,
            amount_paid=amount_paid,
            payment_date=payment_date,
            payment_type=payment_type,
            notes=notes,
            installment_id=installment_id,
        )
        return jsonify(loan_schema.dump(updated)), 200
    except AppError as e:
        return jsonify({"error": e.message}), e.status_code
    except (ValueError, KeyError) as e:
        dwarn("loan_payment.bad_request", loan_id=loan_id, reason=str(e))
        return jsonify({"error": str(e)}), 400
    except Exception:
        logging.exception("loan_payment.create.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500


# ---------------------- Dashboard ------------------------

@loans_bp.route("/dashboard/loan-history", methods=["GET"])
@route_logger
def loan_history_dashboard():
    try:
        start_date_str = request.args.get("start_date")
        end_date_str = request.args.get("end_date")
        data = get_loan_history(start_date_str, end_date_str)
        dinfo_sampled("loan_history.report", has_start=bool(start_date_str), has_end=bool(end_date_str), items=len(data or []))
        return jsonify(data), 200
    except Exception:
        logging.exception("loan_history.unhandled")
        return jsonify({"error": "Sunucu hatası."}), 500

