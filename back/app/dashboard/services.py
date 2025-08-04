from app.banks.models import Bank, BankAccount
from app.loans.models import Loan, LoanPayment
from app.credit_cards.models import CreditCard
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from app import db
from app.expense.models import Expense
from app.income.models import Income
from datetime import datetime

def get_banks_with_accounts_data():
    """
    Fetches all banks and their associated accounts, structured for dashboard display.
    Note: joinedload is removed because Bank.accounts is a lazy='dynamic' relationship.
    """
    banks = Bank.query.order_by(Bank.name).all()

    # Manually serialize to the desired structure
    result = []
    # Schemas are not used here to construct the exact desired output
    # bank_schema = BankSchema()
    # account_schema = BankAccountSchema(many=True)

    for bank in banks:
        # Accessing bank.accounts here will trigger a separate query for each bank
        accounts_data = [
            {
                "id": acc.id,
                "name": acc.name,
                "iban": getattr(acc, 'iban', None),  # Safely access iban
                "currency": getattr(acc, 'currency', 'TRY')  # Safely access currency
            } for acc in bank.accounts
        ]

        bank_data = {
            "id": bank.id,
            "name": bank.name,
            "logo_url": bank.logo_url,
            "accounts": accounts_data
        }
        result.append(bank_data)

    return result


def get_loan_summary_by_bank():
    """
    Her banka için toplam kredi tutarını ve ödenen tutarı hesaplar.
    """
    loan_summary = {}

    # Tüm kredileri banka bilgileriyle birlikte çek
    loans = db.session.query(Loan).options(
        joinedload(Loan.bank_account).joinedload(BankAccount.bank)
    ).all()

    for loan in loans:
        bank_name = loan.bank_account.bank.name
        if bank_name not in loan_summary:
            loan_summary[bank_name] = {
                "total_loan_amount": 0,
                "total_paid_amount": 0
            }

        loan_summary[bank_name]["total_loan_amount"] += float(loan.amount_drawn)

        # Krediye ait ödemelerin toplamını al
        total_paid_for_loan = db.session.query(func.sum(LoanPayment.amount_paid)).filter(
            LoanPayment.loan_id == loan.id
        ).scalar() or 0

        loan_summary[bank_name]["total_paid_amount"] += float(total_paid_for_loan)

    return loan_summary

def get_credit_card_summary_by_bank():
    """
    Her banka için toplam kredi kartı limiti ve toplam güncel borcu hesaplar.
    """
    credit_card_summary = {}

    # Tüm kredi kartlarını banka bilgileriyle birlikte çek
    credit_cards = db.session.query(CreditCard).options(
        joinedload(CreditCard.bank_account).joinedload(BankAccount.bank)
    ).all()

    for card in credit_cards:
        bank_name = card.bank_account.bank.name
        if bank_name not in credit_card_summary:
            credit_card_summary[bank_name] = {
                "total_credit_limit": 0,
                "total_current_debt": 0
            }

        credit_card_summary[bank_name]["total_credit_limit"] += float(card.limit)
        credit_card_summary[bank_name]["total_current_debt"] += float(card.current_debt)

    return credit_card_summary
def get_recent_transactions(limit=5):
    """
    Veritabanından en son eklenen giderleri ve gelirleri birleştirip,
    ilgili tarih alanlarına göre sıralanmış tek bir liste olarak döndürür.
    """
    # Giderleri 'date' (vade tarihi) kolonuna göre en yeniden eskiye sırala
    recent_expenses = Expense.query.order_by(Expense.date.desc()).limit(limit).all()

    # Gelirleri 'created_at' (oluşturulma tarihi) kolonuna göre sırala
    recent_incomes = Income.query.order_by(Income.created_at.desc()).limit(limit).all()

    transactions = []
    for expense in recent_expenses:
        transactions.append({
            "id": f"expense-{expense.id}",
            "type": "GİDER",
            "description": expense.description,
            "amount": float(expense.amount),
            # Giderler için 'date' alanını kullanıyoruz
            "date": expense.date.isoformat() if expense.date else datetime.utcnow().isoformat()
        })

    for income in recent_incomes:
        transactions.append({
            "id": f"income-{income.id}",
            "type": "GELİR",
            "description": income.invoice_name,
            "amount": float(income.total_amount),
            # Gelirler için 'created_at' alanını kullanıyoruz
            "date": income.created_at.isoformat() if income.created_at else datetime.utcnow().isoformat()
        })

    # Tüm işlemleri 'date' anahtarına göre yeniden sırala (en yeniden en eskiye)
    sorted_transactions = sorted(transactions, key=lambda t: t['date'], reverse=True)

    # Sadece en son 'limit' kadarını geri döndür
    return sorted_transactions[:limit]

def generate_financial_health_chart_config():
    credit_cards = CreditCard.query.all()
    
    total_debt = sum(float(card.current_debt or 0) for card in credit_cards)
    total_limit = sum(float(card.limit or 0) for card in credit_cards)
    total_available_limit = sum(float(card.available_limit or 0) for card in credit_cards)
    utilization_rate = (total_debt / total_limit) * 100 if total_limit > 0 else 0

    def get_utilization_color(rate):
        if rate <= 40: return '#8fc674ff'  # Green
        if rate <= 70: return '#d7b46cff'  # Yellow
        return '#d86066ff'  # Red

    chart_data = [
        {'name': 'Kullanılan Bakiye', 'value': total_debt, 'utilizationRate': utilization_rate},
        {'name': 'Kullanılabilir Limit', 'value': total_available_limit, 'utilizationRate': utilization_rate},
    ]

    return {
        'chart_id': 'financial_health',
        'chart_type': 'pie',
        'title': 'Kredi Kartı Finansal Sağlık',
        'mainStatisticLabel': 'Kullanım Oranı',
        'mainStatisticValue': round(utilization_rate, 2),
        'mainStatisticSuffix': '%',
        'mainStatisticColor': get_utilization_color(utilization_rate),
        'chartData': chart_data,
        'chartColors': [get_utilization_color(utilization_rate), '#f0f2f5'],
        'kpis': [
            {'label': 'Toplam Borç', 'value': total_debt},
            {'label': 'Kullanılabilir Limit', 'value': total_available_limit},
        ],
        'showEmptyState': not credit_cards,
        'emptyMessage': 'Kredi kartı verisi bulunmamaktadır.',
        'totalLimit': total_limit
    }

def generate_daily_risk_chart_config(bank_id):
    from collections import defaultdict
    from app.banks.models import DailyRisk, KmhLimit, BankAccount
    from sqlalchemy.orm import joinedload

    print(f"[DEBUG] Starting Daily Risk chart generation for bank_id: {bank_id}")

    # Fetch all daily risks for the given bank_id using joins
    daily_risks = db.session.query(DailyRisk).join(KmhLimit).join(BankAccount).filter(BankAccount.bank_id == bank_id).order_by(DailyRisk.entry_date).all()
    
    print(f"[DEBUG] Found {len(daily_risks)} DailyRisk records for this bank.")

    if not daily_risks:
        return {
            'chart_id': f'daily_risk_{bank_id}',
            'title': 'Günlük Risk (Veri Yok)',
            'chart_type': 'line',
            'data': [],
            'error': 'Bu banka için risk verisi bulunamadı.'
        }

    # Group risks by date
    grouped_by_date = defaultdict(list)
    for risk in daily_risks:
        grouped_by_date[risk.entry_date].append(risk)
    
    print(f"[DEBUG] Grouped daily risks into {len(grouped_by_date)} days.")

    # Calculate the total risk for each day
    final_data = []
    for date, risks_for_day in sorted(grouped_by_date.items()):
        total_for_day = 0
        print(f"\n[DEBUG] Processing date: {date}")
        for risk in risks_for_day:
            # Evening value takes precedence over morning value
            value_to_use = risk.evening_risk if risk.evening_risk is not None else risk.morning_risk
            value_to_use = float(value_to_use) if value_to_use is not None else 0
            
            print(f"  - KmhLimit ID {risk.kmh_limit_id}: evening={risk.evening_risk}, morning={risk.morning_risk}. Using: {value_to_use}")
            total_for_day += value_to_use
        
        final_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'total_risk': total_for_day
        })
        print(f"  -> Total for {date}: {total_for_day}")

    print(f"\n[DEBUG] Final data points for Recharts: {final_data}")

    # Configuration for Recharts on the frontend
    config = {
        'chart_id': f'daily_risk_{bank_id}',
        'title': f'Banka #{bank_id} Günlük Toplam KMH Riski',
        'chart_type': 'line',  # Custom type for our new Recharts component
        'dataKey': 'date',      # Tells Recharts which field is the X-axis
        'lines': [
            {'dataKey': 'total_risk', 'stroke': '#82ca9d', 'name': 'Toplam Risk'}
        ],
        'data': final_data
    }
    
    print(f"[DEBUG] Final Recharts config: {config}")
    return config
