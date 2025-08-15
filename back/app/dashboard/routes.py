# app/dashboard/routes.py
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from .services import (
    get_banks_with_accounts_data,
    get_loan_summary_by_bank,
    get_credit_card_summary_by_bank,
    get_recent_transactions,
    generate_financial_health_chart_config,
    generate_daily_risk_chart_config,
    generate_daily_credit_limit_chart_config,
)
from app.banks.services import get_bank_summary
from app.credit_cards.services import get_credit_cards_grouped_by_bank
from app.credit_cards.schemas import CreditCardSchema
from app.errors import AppError
from app.logging_utils import route_logger, dinfo_sampled

dashboard_bp = Blueprint("dashboard_api", __name__, url_prefix="/api/dashboard")


# ------------------------------ Banks ------------------------------

@dashboard_bp.route("/banks-with-accounts", methods=["GET"])
@route_logger
def get_banks_with_accounts():
    data = get_banks_with_accounts_data()
    # Çok sık çağrılabilecek GET: sampling ile hafif bir bilgi logu bırakıyoruz
    dinfo_sampled("dashboard.banks_with_accounts", banks=len(data))
    return jsonify(data), 200


@dashboard_bp.route("/banks/<int:bank_id>/summary", methods=["GET"])
@route_logger
def get_bank_summary_route(bank_id: int):
    """
    Belirli banka (opsiyonel olarak bank_account_id ile) için özet metrikler.
    4xx: parametre validasyonları, 5xx: beklenmeyenler (global handler yazar).
    """
    bank_account_id = request.args.get("bank_account_id", type=int)
    summary_data = get_bank_summary(bank_id, bank_account_id)
    # get_bank_summary AppError(404) atabilir; burada bubbling bırakıyoruz
    dinfo_sampled("dashboard.bank_summary",
                  bank_id=bank_id,
                  bank_account_id=bank_account_id,
                  has_data=bool(summary_data))
    return jsonify(summary_data), 200


# --------------------------- Credit Cards ---------------------------

@dashboard_bp.route("/credit-cards-by-bank", methods=["GET"])
@route_logger
def get_credit_cards_by_bank():
    grouped_cards = get_credit_cards_grouped_by_bank()
    # Serialize grouped dict -> { bank_name: [cards...] }
    out = {
        bank_name: CreditCardSchema(many=True).dump(cards)
        for bank_name, cards in grouped_cards.items()
    }
    dinfo_sampled("dashboard.cc_by_bank", banks=len(out))
    return jsonify(out), 200


# ------------------------------ Loans ------------------------------

@dashboard_bp.route("/loan-summary-by-bank", methods=["GET"])
@route_logger
def get_loan_summary():
    loan_summary = get_loan_summary_by_bank()
    dinfo_sampled("dashboard.loan_summary", banks=len(loan_summary))
    return jsonify(loan_summary), 200


@dashboard_bp.route("/credit-card-summary-by-bank", methods=["GET"])
@route_logger
def get_credit_card_summary():
    cc_summary = get_credit_card_summary_by_bank()
    dinfo_sampled("dashboard.cc_summary", banks=len(cc_summary))
    return jsonify(cc_summary), 200


# --------------------------- Recent activity ---------------------------

@dashboard_bp.route("/recent-transactions", methods=["GET"])
@route_logger
def recent_transactions():
    """
    En son gelir/gider işlemlerinin birleşik listesi.
    """
    tx = get_recent_transactions()
    dinfo_sampled("dashboard.recent_tx", count=len(tx))
    return jsonify(tx), 200


# ------------------------------ Charts ------------------------------

@dashboard_bp.route("/charts/financial-health/<int:bank_id>", methods=["GET"])
@route_logger
def get_financial_health_chart(bank_id: int):
    bank_account_id = request.args.get("bank_account_id", type=int)
    cfg = generate_financial_health_chart_config(bank_id, bank_account_id)
    dinfo_sampled("dashboard.chart.fin_health",
                  bank_id=bank_id, bank_account_id=bank_account_id)
    return jsonify(cfg), 200


@dashboard_bp.route("/charts/daily-risk/<int:bank_id>", methods=["GET"])
@route_logger
def get_daily_risk_chart(bank_id: int):
    bank_account_id = request.args.get("bank_account_id", type=int)
    cfg = generate_daily_risk_chart_config(bank_id, bank_account_id)
    dinfo_sampled("dashboard.chart.daily_risk",
                  bank_id=bank_id, bank_account_id=bank_account_id)
    return jsonify(cfg), 200


@dashboard_bp.route("/charts/daily-credit-limit/<int:bank_id>", methods=["GET"])
@route_logger
def get_daily_credit_limit_chart(bank_id: int):
    bank_account_id = request.args.get("bank_account_id", type=int)
    cfg = generate_daily_credit_limit_chart_config(bank_id, bank_account_id)
    dinfo_sampled("dashboard.chart.daily_credit_limit",
                  bank_id=bank_id, bank_account_id=bank_account_id)
    return jsonify(cfg), 200

