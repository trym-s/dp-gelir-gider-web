# app/bank_logs/routes.py
from flask import request, jsonify
from app.errors import AppError
from app.logging_utils import route_logger, dinfo
from app.route_factory import create_api_blueprint
from .services import bank_log_service
from .schemas import BankLogSchema
from .models import BankLog

# 1) CRUD için standart blueprint (factory zaten @route_logger içeriyorsa tekrarlamayın)
bank_logs_bp = create_api_blueprint('bank-logs', bank_log_service, BankLogSchema())

# 2) Özel: dönem bazlı okuma
@bank_logs_bp.route('/by-period', methods=['GET'])
@route_logger
def get_bank_logs_by_period():
    """
    ?date=YYYY-MM-DD&period=morning|evening|all
    Banka loglarını verilen tarih + dönem için döner.
    Servis bazı bankalar için placeholder döndürebilir (dict), kalanlar model -> schema.dump.
    """
    date_str = request.args.get('date')
    period_str = request.args.get('period')

    if not date_str or not period_str:
        raise AppError("date and period query params are required.", 400, code="MISSING_QUERY")

    # Servis format/doğrulamasını kendi içinde yapmalı; ValueError atıyorsa 400'e çeviriyoruz.
    try:
        logs = bank_log_service.get_all_logs_for_period(date_str, period_str)
    except ValueError as ve:
        raise AppError(str(ve), 400, code="INVALID_QUERY")

    schema = BankLogSchema()
    result = [schema.dump(x) if isinstance(x, BankLog) else x for x in (logs or [])]
    dinfo("bank_logs.by_period", date=date_str, period=period_str, count=len(result))
    return jsonify(result), 200

# 3) Özel: tek kayıt upsert
@bank_logs_bp.route('/upsert', methods=['POST'])
@route_logger
def upsert_bank_log():
    """
    Tek bir bank log kaydı oluşturur/günceller (id veya unique alanlarla).
    Body zorunlu.
    """
    data = request.get_json(silent=True)
    if not data:
        raise AppError("request body is required.", 400, code="EMPTY_BODY")

    try:
        row = bank_log_service.create_or_update_log(data)
    except ValueError as ve:
        # Servis validasyonunu ValueError ile sinyalliyorsa 400'e mapleyelim
        raise AppError(str(ve), 400, code="VALIDATION_ERROR")

    return jsonify(BankLogSchema().dump(row)), 200

# 4) Özel: batch upsert (tek transaksiyon)
@bank_logs_bp.route('/batch-upsert', methods=['POST'])
@route_logger
def batch_upsert_bank_logs():
    """
    Birden çok log kaydını tek transaction içinde upsert eder.
    Body: non-empty list
    """
    data = request.get_json(silent=True)
    if not isinstance(data, list) or not data:
        raise AppError("request body must be a non-empty list.", 400, code="INVALID_BODY")

    try:
        rows = bank_log_service.batch_upsert_logs(data)
    except ValueError as ve:
        raise AppError(str(ve), 400, code="VALIDATION_ERROR")

    return jsonify(BankLogSchema(many=True).dump(rows or [])), 200

