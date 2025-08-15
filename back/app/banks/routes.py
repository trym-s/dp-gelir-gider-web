
# app/banks/routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime

from app.errors import AppError
from app.logging_utils import route_logger, dinfo  # route.enter/exit + kısa domain logları
from . import services
from .schemas import (
    BankSchema, BankAccountSchema, DailyBalanceSchema,
    KmhLimitSchema, DailyRiskSchema, StatusHistorySchema
)

# NOT: logging.basicConfig vb. KULLANMA. Global logging_config zaten var.

# Blueprints
banks_bp = Blueprint("banks_api", __name__, url_prefix="/api")
bank_status_bp = Blueprint("bank_status_api", __name__, url_prefix="/api/bank_status")
kmh_bp = Blueprint("kmh_api", __name__, url_prefix="/api/kmh")

# ----------------------- Banks -----------------------

@banks_bp.route("/banks", methods=["GET", "POST"])
@route_logger
def handle_banks():
    if request.method == "GET":
        rows = services.get_all_banks()
        dinfo("banks.list", count=len(rows))
        return jsonify(BankSchema(many=True).dump(rows)), 200

    # POST
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")

    bank = services.create_bank(data)
    dinfo("banks.create", bank_id=getattr(bank, "id", None))
    return jsonify(BankSchema().dump(bank)), 201


@banks_bp.route("/banks/<int:bank_id>", methods=["GET", "PUT", "DELETE"])
@route_logger
def handle_single_bank(bank_id):
    if request.method == "GET":
        bank = services.get_bank_by_id(bank_id)
        if not bank:
            raise AppError("Bank not found.", 404, code="NOT_FOUND")
        return jsonify(BankSchema().dump(bank)), 200

    if request.method == "PUT":
        data = request.get_json(silent=True)
        if not data:
            raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
        bank = services.update_bank(bank_id, data)
        if not bank:
            raise AppError("Bank not found.", 404, code="NOT_FOUND")
        dinfo("banks.update", bank_id=bank_id)
        return jsonify(BankSchema().dump(bank)), 200

    # DELETE
    deleted = services.delete_bank(bank_id)
    if not deleted:
        raise AppError("Bank not found.", 404, code="NOT_FOUND")
    dinfo("banks.delete", bank_id=bank_id)
    return jsonify({"message": "Bank deleted successfully"}), 200


@banks_bp.route("/banks/<int:bank_id>/summary", methods=["GET"])
@route_logger
def get_bank_summary_route(bank_id):
    summary = services.get_bank_summary(bank_id)
    dinfo("banks.summary", bank_id=bank_id)
    return jsonify(summary), 200


# ----------------------- Bank Accounts -----------------------

@banks_bp.route("/bank-accounts", methods=["GET", "POST"])
@route_logger
def handle_bank_accounts():
    if request.method == "GET":
        rows = services.get_all_bank_accounts()
        dinfo("bank_accounts.list", count=len(rows))
        return jsonify(BankAccountSchema(many=True).dump(rows)), 200

    # POST
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
    acc = services.create_bank_account(data)  # iş kuralı 4xx ise AppError fırlatmalı
    dinfo("bank_accounts.create", account_id=getattr(acc, "id", None))
    return jsonify(BankAccountSchema().dump(acc)), 201


@banks_bp.route("/bank-accounts/<int:account_id>", methods=["GET", "PUT", "DELETE"])
@route_logger
def handle_single_bank_account(account_id):
    if request.method == "GET":
        acc = services.get_bank_account_by_id(account_id)
        if not acc:
            raise AppError("Bank account not found.", 404, code="NOT_FOUND")
        return jsonify(BankAccountSchema().dump(acc)), 200

    if request.method == "PUT":
        data = request.get_json(silent=True)
        if not data:
            raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
        acc = services.update_bank_account(account_id, data)
        if not acc:
            raise AppError("Bank account not found.", 404, code="NOT_FOUND")
        dinfo("bank_accounts.update", account_id=account_id)
        return jsonify(BankAccountSchema().dump(acc)), 200

    # DELETE
    deleted = services.delete_bank_account(account_id)
    if not deleted:
        raise AppError("Bank account not found.", 404, code="NOT_FOUND")
    dinfo("bank_accounts.delete", account_id=account_id)
    return jsonify({"message": "Bank account deleted successfully"}), 200


@banks_bp.route("/bank-accounts/for-selection", methods=["GET"])
@route_logger
def get_accounts_for_selection_route():
    rows = services.get_all_accounts_for_selection()
    dinfo("bank_accounts.selection", count=len(rows))
    return jsonify(BankAccountSchema(many=True).dump(rows)), 200


# ----------------------- KMH -----------------------

@kmh_bp.route("/", methods=["GET"])
@route_logger
def get_kmh_accounts_route():
    rows = services.get_kmh_accounts()
    dinfo("kmh.list", count=len(rows))
    # services.get_kmh_accounts() zaten dict listesi döndürüyorsa direkt dönüyoruz
    return jsonify(rows), 200


@kmh_bp.route("/", methods=["POST"])
@route_logger
def create_kmh_limit_route():
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
    row = services.create_kmh_limit(data)
    dinfo("kmh.create", kmh_id=getattr(row, "id", None))
    return jsonify(KmhLimitSchema().dump(row)), 201


@kmh_bp.route("/<int:kmh_id>", methods=["PUT"])
@route_logger
def update_kmh_limit_route(kmh_id):
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
    row = services.update_kmh_limit(kmh_id, data)
    if not row:
        raise AppError("KMH record not found.", 404, code="NOT_FOUND")
    dinfo("kmh.update", kmh_id=kmh_id)
    return jsonify(KmhLimitSchema().dump(row)), 200


@kmh_bp.route("/daily-risks/<int:year>/<int:month>", methods=["GET"])
@route_logger
def get_daily_risks_route(year, month):
    rows = services.get_daily_risks_for_month(year, month)
    dinfo("kmh.daily_risks", year=year, month=month, count=len(rows) if rows else 0)
    return jsonify(rows), 200


@kmh_bp.route("/daily-entries", methods=["POST"])
@route_logger
def save_daily_risk_entries_route():
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
    res = services.save_daily_risk_entries(data)
    dinfo("kmh.daily_entries.save", items=len(data) if isinstance(data, list) else 1)
    return jsonify(res), 200


@kmh_bp.route("/<int:kmh_id>", methods=["DELETE"])
@route_logger
def delete_kmh_limit_route(kmh_id):
    deleted = services.delete_kmh_limit(kmh_id)
    if not deleted:
        raise AppError("KMH record not found.", 404, code="NOT_FOUND")
    dinfo("kmh.delete", kmh_id=kmh_id)
    return jsonify({"message": "KMH limiti silindi"}), 200


# ----------------------- Bank Status / History -----------------------

@bank_status_bp.route("/accounts-with-status", methods=["GET"])
@route_logger
def get_accounts_with_status():
    rows = services.get_all_bank_accounts()  # servis tarafı statüyü join’liyorsa çıkar
    dinfo("bank_status.accounts_with_status", count=len(rows))
    return jsonify(BankAccountSchema(many=True).dump(rows)), 200


@bank_status_bp.route("/balance_history", methods=["GET"])
@route_logger
def get_balance_history():
    bank_name = request.args.get("bank_name")
    account_name = request.args.get("account_name")
    if not bank_name or not account_name:
        raise AppError("bank_name and account_name are required.", 400, code="MISSING_QUERY")
    history = services.get_balance_history_for_account(bank_name, account_name)
    dinfo("bank_status.balance_history", bank_name=bank_name, account_name=account_name, items=len(history) if history else 0)
    return jsonify(history), 200


@bank_status_bp.route("/daily_balances/<int:year>/<int:month>", methods=["GET"])
@route_logger
def get_daily_balances_route(year, month):
    rows = services.get_daily_balances_for_month(year, month)
    dinfo("bank_status.daily_balances", year=year, month=month, items=len(rows) if rows else 0)
    return jsonify(rows), 200


@bank_status_bp.route("/daily_entries", methods=["POST"])
@route_logger
def save_daily_balance_entries_route():
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
    services.save_daily_balance_entries(data)
    dinfo("bank_status.daily_entries.save", items=len(data) if isinstance(data, list) else 1)
    return jsonify({"message": "Daily balance entries saved successfully"}), 200


@bank_status_bp.route("/status-history/", methods=["GET", "POST"])
@route_logger
def handle_status_history():
    if request.method == "GET":
        subject_type = request.args.get("subject_type")
        subject_id = request.args.get("subject_id", type=int)
        if not subject_type or subject_id is None:
            raise AppError("subject_type and subject_id are required.", 400, code="MISSING_QUERY")
        rows = services.get_status_history(subject_type, subject_id)
        dinfo("status_history.list", subject_type=subject_type, subject_id=subject_id, items=len(rows))
        return jsonify(StatusHistorySchema(many=True).dump(rows)), 200

    # POST
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body must be JSON.", 400, code="EMPTY_BODY")
    res = services.save_status(data)  # servis 4xx’de AppError atmalı
    dinfo("status_history.save", subject_type=data.get("subject_type"), subject_id=data.get("subject_id"))
    return jsonify(res), 200

