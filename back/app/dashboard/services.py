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
                "iban_number": acc.iban_number,
                "currency": getattr(acc, 'currency', 'TRY')
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

def generate_financial_health_chart_config(bank_id=None, bank_account_id=None):
    from app.credit_cards.models import CreditCard, BankAccount

    query = CreditCard.query
    if bank_id or bank_account_id:
        query = query.join(BankAccount) # Join the BankAccount table
        if bank_id:
            query = query.filter(BankAccount.bank_id == bank_id)
        if bank_account_id:
            query = query.filter(BankAccount.id == bank_account_id)

    credit_cards = query.all()
    
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

def generate_daily_risk_chart_config(bank_id, bank_account_id=None):
    from collections import defaultdict
    from app.banks.models import DailyRisk, KmhLimit, BankAccount
    from sqlalchemy.orm import joinedload
    import random

    print(f"[DEBUG] Starting Daily Risk chart generation for bank_id: {bank_id}")

    # Fetch all daily risks for the given bank_id using joins
    query = db.session.query(DailyRisk).options(
        joinedload(DailyRisk.kmh_limit).joinedload(KmhLimit.account)
    ).join(KmhLimit).join(BankAccount).filter(BankAccount.bank_id == bank_id)

    if bank_account_id:
        query = query.filter(BankAccount.id == bank_account_id)

    daily_risks = query.order_by(DailyRisk.entry_date).all()
    
    print(f"[DEBUG] Found {len(daily_risks)} DailyRisk records for this bank.")

    if not daily_risks:
        return {
            'chart_id': f'daily_risk_{bank_id}',
            'title': 'Günlük Risk (Veri Yok)',
            'chart_type': 'line',
            'data': [],
            'error': 'Bu banka için risk verisi bulunamadı.'
        }

    # Group risks by date and account
    grouped_by_date = defaultdict(lambda: defaultdict(float))
    account_names = {}
    for risk in daily_risks:
        date_str = risk.entry_date.strftime('%Y-%m-%d')
        value_to_use = risk.evening_risk if risk.evening_risk is not None else risk.morning_risk
        value_to_use = float(value_to_use) if value_to_use is not None else 0
        
        # Use a consistent key for each account
        account_key = f"account_{risk.kmh_limit.id}"
        grouped_by_date[date_str][account_key] += value_to_use
        
        # Store account names for the legend
        if account_key not in account_names:
            account_names[account_key] = risk.kmh_limit.account.name

    # Calculate the total risk for each day and format for Recharts
    final_data = []
    # Ensure all dates are present and sorted
    sorted_dates = sorted(grouped_by_date.keys())
    for date in sorted_dates:
        accounts_data = grouped_by_date[date]
        day_data = {'date': date, 'total_risk': sum(accounts_data.values())}
        day_data.update(accounts_data)
        final_data.append(day_data)

    # Generate a random color for a line
    def get_random_color():
        return f"#{random.randint(0, 0xFFFFFF):06x}"

    # Configuration for Recharts on the frontend
    lines = [{'dataKey': 'total_risk', 'stroke': '#82ca9d', 'name': 'Toplam Risk'}]
    for account_key, account_name in account_names.items():
        lines.append({'dataKey': account_key, 'stroke': get_random_color(), 'name': account_name})

    config = {
        'chart_id': f'daily_risk_{bank_id}',
        'title': f'Banka #{bank_id} Günlük Toplam KMH Riski',
        'chart_type': 'line',
        'dataKey': 'date',
        'lines': lines,
        'data': final_data
    }
    
    print(f"[DEBUG] Final Recharts config: {config}")
    return config

def generate_daily_credit_limit_chart_config(bank_id, bank_account_id=None):
    from collections import defaultdict
    from app.credit_cards.models import DailyCreditCardLimit, CreditCard, BankAccount
    from sqlalchemy.orm import joinedload
    import random

    query = db.session.query(DailyCreditCardLimit).options(
        joinedload(DailyCreditCardLimit.credit_card).joinedload(CreditCard.bank_account)
    ).join(CreditCard).join(BankAccount).filter(BankAccount.bank_id == bank_id)

    if bank_account_id:
        query = query.filter(BankAccount.id == bank_account_id)

    daily_limits = query.order_by(DailyCreditCardLimit.entry_date).all()

    if not daily_limits:
        return {
            'chart_id': f'daily_credit_limit_{bank_id}',
            'title': 'Günlük Kredi Kartı Limiti (Veri Yok)',
            'chart_type': 'line',
            'data': [],
            'error': 'Bu banka için kredi kartı limit verisi bulunamadı.'
        }

    grouped_by_date = defaultdict(lambda: defaultdict(float))
    card_names = {}
    for limit in daily_limits:
        date_str = limit.entry_date.strftime('%Y-%m-%d')
        value_to_use = limit.evening_limit if limit.evening_limit is not None else limit.morning_limit
        value_to_use = float(value_to_use) if value_to_use is not None else 0
        
        card_key = f"card_{limit.credit_card.id}"
        grouped_by_date[date_str][card_key] += value_to_use
        
        if card_key not in card_names:
            card_names[card_key] = limit.credit_card.name

    final_data = []
    sorted_dates = sorted(grouped_by_date.keys())
    for date in sorted_dates:
        cards_data = grouped_by_date[date]
        day_data = {'date': date, 'total_limit': sum(cards_data.values())}
        day_data.update(cards_data)
        final_data.append(day_data)

    def get_random_color():
        return f"#{random.randint(0, 0xFFFFFF):06x}"

    lines = [{'dataKey': 'total_limit', 'stroke': '#8884d8', 'name': 'Toplam Limit'}]
    for card_key, card_name in card_names.items():
        lines.append({'dataKey': card_key, 'stroke': get_random_color(), 'name': card_name})

    config = {
        'chart_id': f'daily_credit_limit_{bank_id}',
        'title': f'Banka #{bank_id} Günlük Toplam Kredi Kartı Limiti',
        'chart_type': 'line',
        'dataKey': 'date',
        'lines': lines,
        'data': final_data
    }
    
    return config
