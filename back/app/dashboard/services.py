
# app/dashboard/services.py
from collections import defaultdict
from datetime import datetime
from sqlalchemy import func, case
from sqlalchemy.orm import joinedload

from app import db
from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dinfo_sampled

from app.banks.models import Bank, BankAccount, DailyRisk, KmhLimit
from app.credit_cards.models import CreditCard, CreditCardTransaction, DailyCreditCardLimit
from app.loans.models import Loan, LoanPayment
from app.expense.models import Expense
from app.income.models import Income


# -------------------------------------------------------------------
# Banks + Accounts
# -------------------------------------------------------------------

@service_logger
def get_banks_with_accounts_data():
    """
    Tüm bankaları ve ilişkili hesaplarını (KMH limitleriyle) döndürür.
    """
    banks = Bank.query.options(
        joinedload(Bank.accounts).joinedload(BankAccount.kmh_limits)
    ).order_by(Bank.name).all()

    result = []
    for bank in banks:
        accounts_data = []
        for acc in bank.accounts:
            kmh_limit_value = acc.kmh_limits[0].kmh_limit if acc.kmh_limits else None
            accounts_data.append({
                "id": acc.id,
                "name": acc.name,
                "iban_number": acc.iban_number,
                "currency": getattr(acc, "currency", "TRY"),
                "kmh_limit": float(kmh_limit_value) if kmh_limit_value is not None else None,
            })
        result.append({
            "id": bank.id,
            "name": bank.name,
            "logo_url": bank.logo_url,
            "accounts": accounts_data,
        })

    dinfo_sampled("dashboard.banks_with_accounts.built", banks=len(result))
    return result


# -------------------------------------------------------------------
# Summaries (grouped and efficient)
# -------------------------------------------------------------------

@service_logger
def get_loan_summary_by_bank():
    """
    Her banka için:
      - total_loan_amount = sum(Loan.amount_drawn)
      - total_paid_amount = sum(LoanPayment.amount_paid)
    Tek seferde gruplanmış sorgularla getirir (N+1 yok).
    """
    # 1) Ödemeleri loan bazında topla
    paid_sq = (
        db.session.query(
            LoanPayment.loan_id.label("loan_id"),
            func.coalesce(func.sum(LoanPayment.amount_paid), 0).label("paid_sum"),
        )
        .group_by(LoanPayment.loan_id)
        .subquery()
    )

    # 2) Banka bazında hem çekilen tutarı hem de ödenen toplamı grupla
    rows = (
        db.session.query(
            Bank.name.label("bank_name"),
            func.coalesce(func.sum(Loan.amount_drawn), 0).label("total_drawn"),
            func.coalesce(func.sum(paid_sq.c.paid_sum), 0).label("total_paid"),
        )
        .join(BankAccount, BankAccount.bank_id == Bank.id)
        .join(Loan, Loan.bank_account_id == BankAccount.id)
        .outerjoin(paid_sq, paid_sq.c.loan_id == Loan.id)
        .group_by(Bank.name)
        .all()
    )

    out = {
        r.bank_name: {
            "total_loan_amount": float(r.total_drawn or 0),
            "total_paid_amount": float(r.total_paid or 0),
        }
        for r in rows
    }

    dinfo_sampled("dashboard.loan_summary.built", banks=len(out))
    return out


@service_logger
def get_credit_card_summary_by_bank():
    """
    Her banka için:
      - total_credit_limit = sum(CreditCard.limit)
      - total_current_debt = sum(expenses - payments)  (işlem tablosundan)
    DB-agnostic toplamlara geçirilmiştir (CASE ile).
    """
    # Kart bazında borçları (expense - payment) toplayan alt sorgu
    debt_sq = (
        db.session.query(
            CreditCardTransaction.credit_card_id.label("cc_id"),
            (
                func.coalesce(
                    func.sum(
                        case(
                            (CreditCardTransaction.type == 'EXPENSE', CreditCardTransaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                )
                - func.coalesce(
                    func.sum(
                        case(
                            (CreditCardTransaction.type == 'PAYMENT', CreditCardTransaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                )
            ).label("debt"),
        )
        .group_by(CreditCardTransaction.credit_card_id)
        .subquery()
    )

    rows = (
        db.session.query(
            Bank.name.label("bank_name"),
            func.coalesce(func.sum(CreditCard.limit), 0).label("total_limit"),
            func.coalesce(func.sum(debt_sq.c.debt), 0).label("total_debt"),
        )
        .join(BankAccount, BankAccount.bank_id == Bank.id)
        .join(CreditCard, CreditCard.bank_account_id == BankAccount.id)
        .outerjoin(debt_sq, debt_sq.c.cc_id == CreditCard.id)  # 1 satır/kart garantisi
        .group_by(Bank.name)
        .all()
    )

    out = {
        r.bank_name: {
            "total_credit_limit": float(r.total_limit or 0),
            "total_current_debt": float(r.total_debt or 0),
        }
        for r in rows
    }

    dinfo_sampled("dashboard.cc_summary.built", banks=len(out))
    return out


# -------------------------------------------------------------------
# Recent transactions (lightweight)
# -------------------------------------------------------------------

@service_logger
def get_recent_transactions(limit=5):
    """
    En son giderleri (Expense.date) ve gelirleri (Income.created_at) birleştirip,
    tarihine göre sıralı tek listede döndürür.
    """
    recent_expenses = Expense.query.order_by(Expense.date.desc()).limit(limit).all()
    recent_incomes = Income.query.order_by(Income.created_at.desc()).limit(limit).all()

    tx = []
    for e in recent_expenses:
        tx.append({
            "id": f"expense-{e.id}",
            "type": "GİDER",
            "description": e.description,
            "amount": float(e.amount),
            "date": (e.date or datetime.utcnow().date()).isoformat(),
        })
    for inc in recent_incomes:
        tx.append({
            "id": f"income-{inc.id}",
            "type": "GELİR",
            "description": inc.invoice_name,
            "amount": float(inc.total_amount),
            "date": (inc.created_at or datetime.utcnow()).isoformat(),
        })

    tx.sort(key=lambda t: t["date"], reverse=True)
    dinfo_sampled("dashboard.recent_tx.built", count=len(tx))
    return tx[:limit]


# -------------------------------------------------------------------
# Charts
# -------------------------------------------------------------------

@service_logger
def generate_financial_health_chart_config(bank_id=None, bank_account_id=None):
    """
    Kredi kartı borcu/limitlerinden finansal sağlık pastası üretir.
    Tek tip: 'data' (ve geçiş süreci için 'chartData' alias).
    """
    # Kart bazında borç (expense - payment) alt sorgusu
    debt_sq = (
        db.session.query(
            CreditCardTransaction.credit_card_id.label("cc_id"),
            (
                func.coalesce(
                    func.sum(
                        case(
                            (CreditCardTransaction.type == 'EXPENSE', CreditCardTransaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                )
                - func.coalesce(
                    func.sum(
                        case(
                            (CreditCardTransaction.type == 'PAYMENT', CreditCardTransaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                )
            ).label("debt"),
        )
        .group_by(CreditCardTransaction.credit_card_id)
        .subquery()
    )

    # Limit ve borcu tek satırda topla (outerjoin alt sorgu → limit çoğalmaz)
    query = (
        db.session.query(
            func.coalesce(func.sum(CreditCard.limit), 0).label("total_limit"),
            func.coalesce(func.sum(debt_sq.c.debt), 0).label("total_debt"),
        )
        .select_from(CreditCard)
        .outerjoin(debt_sq, debt_sq.c.cc_id == CreditCard.id)
    )

    if bank_id or bank_account_id:
        query = query.join(BankAccount)
        if bank_id:
            query = query.filter(BankAccount.bank_id == bank_id)
        if bank_account_id:
            query = query.filter(BankAccount.id == bank_account_id)

    summary = query.one()
    total_debt = float(summary.total_debt or 0)
    total_limit = float(summary.total_limit or 0)
    total_available = max(total_limit - total_debt, 0.0)
    utilization = (total_debt / total_limit) * 100 if total_limit > 0 else 0.0

    def color(rate: float) -> str:
        if rate <= 40:
            return "#8fc674ff"
        if rate <= 70:
            return "#d7b46cff"
        return "#d86066ff"

    series = [
        {"name": "Kullanılan Bakiye", "value": total_debt, "utilizationRate": utilization},
        {"name": "Kullanılabilir Limit", "value": total_available, "utilizationRate": utilization},
    ]

    cfg = {
        "chart_id": "financial_health",
        "chart_type": "pie",
        "title": "Kredi Kartı Finansal Sağlık",
        "mainStatisticLabel": "Kullanım Oranı",
        "mainStatisticValue": round(utilization, 2),
        "mainStatisticSuffix": "%",
        "mainStatisticColor": color(utilization),
        # >>> Standart alan
        "data": series,
        # >>> Geçiş süreci için alias (eski frontend chartData okuyorsa)
        "chartData": series,
        "chartColors": [color(utilization), "#f0f2f5"],
        "kpis": [
            {"label": "Toplam Borç TL", "value": total_debt},
            {"label": "Kullanılabilir Limit", "value": total_available},
        ],
        "showEmptyState": total_limit == 0,
        "emptyMessage": "Kredi kartı verisi bulunmamaktadır.",
        "totalLimit": total_limit,
    }

    dinfo_sampled(
        "dashboard.fin_health_chart.built",
        bank_id=bank_id,
        bank_account_id=bank_account_id,
        cards=1 if total_limit > 0 else 0,
        utilization=round(utilization, 2),
    )
    return cfg


@service_logger
def generate_daily_risk_chart_config(bank_id, bank_account_id=None):
    """
    KMH risklerini (sabah/akşam) gün bazında toplar; Recharts için config döner.
    """
    query = (
        db.session.query(DailyRisk)
        .options(joinedload(DailyRisk.kmh_limit).joinedload(KmhLimit.account))
        .join(KmhLimit)
        .join(BankAccount)
        .filter(BankAccount.bank_id == bank_id)
        .order_by(DailyRisk.entry_date.asc())
    )
    if bank_account_id:
        query = query.filter(BankAccount.id == bank_account_id)

    daily_risks = query.all()

    if not daily_risks:
        dinfo("dashboard.daily_risk_chart.empty", bank_id=bank_id, bank_account_id=bank_account_id)
        return {
            "chart_id": f"daily_risk_{bank_id}",
            "title": "Günlük Risk (Veri Yok)",
            "chart_type": "line",
            "data": [],
            "error": "Bu banka için risk verisi bulunamadı.",
        }

    grouped = defaultdict(lambda: defaultdict(float))
    account_names = {}

    for r in daily_risks:
        date_str = r.entry_date.strftime("%Y-%m-%d")
        val = r.evening_risk if r.evening_risk is not None else r.morning_risk
        val = float(val) if val is not None else 0.0
        key = f"account_{r.kmh_limit.id}"
        grouped[date_str][key] += val
        if key not in account_names:
            account_names[key] = r.kmh_limit.account.name

    data = []
    for d in sorted(grouped.keys()):
        row = grouped[d]
        total = sum(row.values())
        item = {"date": d, "total_risk": total}
        item.update(row)
        data.append(item)

    lines = [{"dataKey": "total_risk", "stroke": "#82ca9d", "name": "Toplam Risk"}]
    for key, name in account_names.items():
        lines.append({"dataKey": key, "name": name})

    cfg = {
        "chart_id": f"daily_risk_{bank_id}",
        "title": f"Banka #{bank_id} Günlük Toplam KMH Riski",
        "chart_type": "line",
        "dataKey": "date",
        "lines": lines,
        "data": data,  # <<< tek tip anahtar
    }

    dinfo_sampled(
        "dashboard.daily_risk_chart.built",
        bank_id=bank_id,
        bank_account_id=bank_account_id,
        days=len(data),
        series=len(lines),
    )
    return cfg


@service_logger
def generate_daily_credit_limit_chart_config(bank_id, bank_account_id=None):
    """
    Kredi kartı günlük limit serilerini Recharts konfigürasyonu olarak döndürür.
    """
    query = (
        db.session.query(DailyCreditCardLimit)
        .options(joinedload(DailyCreditCardLimit.credit_card).joinedload(CreditCard.bank_account))
        .join(CreditCard)
        .join(BankAccount)
        .filter(BankAccount.bank_id == bank_id)
        .order_by(DailyCreditCardLimit.entry_date.asc())
    )
    if bank_account_id:
        query = query.filter(BankAccount.id == bank_account_id)

    rows = query.all()
    if not rows:
        dinfo("dashboard.daily_cc_limit_chart.empty", bank_id=bank_id, bank_account_id=bank_account_id)
        return {
            "chart_id": f"daily_credit_limit_{bank_id}",
            "title": "Günlük Kredi Kartı Limiti (Veri Yok)",
            "chart_type": "line",
            "data": [],
            "error": "Bu banka için kredi kartı limit verisi bulunamadı.",
        }

    grouped = defaultdict(lambda: defaultdict(float))
    card_names = {}

    for r in rows:
        date_str = r.entry_date.strftime("%Y-%m-%d")
        val = r.evening_limit if r.evening_limit is not None else r.morning_limit
        val = float(val) if val is not None else 0.0
        key = f"card_{r.credit_card.id}"
        grouped[date_str][key] += val
        if key not in card_names:
            card_names[key] = r.credit_card.name

    data = []
    for d in sorted(grouped.keys()):
        row = grouped[d]
        total = sum(row.values())
        item = {"date": d, "total_limit": total}
        item.update(row)
        data.append(item)

    lines = [{"dataKey": "total_limit", "stroke": "#8884d8", "name": "Toplam Limit"}]
    for key, name in card_names.items():
        lines.append({"dataKey": key, "name": name})

    cfg = {
        "chart_id": f"daily_credit_limit_{bank_id}",
        "title": f"Banka #{bank_id} Günlük Toplam Kredi Kartı Limiti",
        "chart_type": "line",
        "dataKey": "date",
        "lines": lines,
        "data": data,  # <<< tek tip anahtar
    }

    dinfo_sampled(
        "dashboard.daily_cc_limit_chart.built",
        bank_id=bank_id,
        bank_account_id=bank_account_id,
        days=len(data),
        series=len(lines),
    )
    return cfg

