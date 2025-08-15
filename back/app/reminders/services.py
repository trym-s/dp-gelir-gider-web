# app/reminders/services.py

from sqlalchemy import and_, or_, func, literal, case
from app import db
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
# Gerekli olan TÜM doğru modelleri import ediyoruz
from app.banks.models import Bank, BankAccount, DailyBalance, KmhLimit, DailyRisk
from app.bank_logs.models import BankLog
from app.credit_cards.models import CreditCard, DailyCreditCardLimit
from app.loans.models import Loan, LoanStatus
from app.income.models import Income, IncomeStatus
# YENİ: Gider hatırlatması için Expense ve Supplier modellerini import ediyoruz
from app.expense.models import Expense, ExpenseStatus, Supplier
# YENİ: Gelir hatırlatması için Customer modelini import ediyoruz
from app.customer.models import Customer


def get_all_reminders():
    """Tüm hatırlatma türlerini toplayıp tek bir liste olarak döndürür."""
    today = date.today()
    upcoming_limit = today + timedelta(days=3)
    reminders = []

    # 1. Eksik Günlük Girişler
    reminders.extend(get_missing_daily_entries(today))
    
    # 2. Yaklaşan Kredi Kartı Ekstreleri
    reminders.extend(get_upcoming_statement_dates(today))

    # 3. Yaklaşan Kredi Ödemeleri
    reminders.extend(get_upcoming_loan_payments(today, upcoming_limit))

    # 4. Yaklaşan Gelir Tahsilatları (Güncellendi)
    reminders.extend(get_upcoming_income_due_dates(today, upcoming_limit))

    # 5. YENİ: Yaklaşan Gider Ödemeleri
    reminders.extend(get_upcoming_expense_due_dates(today, upcoming_limit))
    
    return reminders

# --- get_missing_daily_entries fonksiyonu aynı kalıyor ---
def get_missing_daily_entries(today):
    missing_entries = []
    banks_with_today_log = {
        (bank_id, period.name): True for bank_id, period in
        db.session.query(BankLog.bank_id, BankLog.period)
        .filter(
            BankLog.date == today,
            # Sadece en az bir para biriminde sıfırdan farklı bir bakiye varsa,
            # o kaydı "girilmiş" olarak kabul et.
            db.or_(
                BankLog.amount_try != 0,
                BankLog.amount_usd != 0,
                BankLog.amount_eur != 0,
                BankLog.amount_aed != 0,
                BankLog.amount_gbp != 0
            )
        ).all()
    }
    
    # Veritabanındaki TÜM bankaları döngüye al ve "gerçek" giriş olup olmadığını kontrol et
    for bank in Bank.query.all():
        morning_exists = banks_with_today_log.get((bank.id, 'morning'))
        evening_exists = banks_with_today_log.get((bank.id, 'evening'))
        desc = bank.name
        
        if not morning_exists and not evening_exists:
            missing_entries.append({'id': f'banklog-both-{bank.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Banka Bakiye Girişi Bekleniyor', 'description': f"{desc} (Sabah/Akşam)", 'due_date': None, 'meta': {'entry_type': 'bank_log', 'bank_id': bank.id}})
        elif not morning_exists:
            missing_entries.append({'id': f'banklog-morning-{bank.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Banka Bakiye Girişi Bekleniyor', 'description': f"{desc} (Sabah)", 'due_date': None, 'meta': {'entry_type': 'bank_log', 'bank_id': bank.id}})
        elif not evening_exists:
            missing_entries.append({'id': f'banklog-evening-{bank.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Banka Bakiye Girişi Bekleniyor', 'description': f"{desc} (Akşam)", 'due_date': None, 'meta': {'entry_type': 'bank_log', 'bank_id': bank.id}})
    accounts_with_today_balance = {acc_id: {'morning': m, 'evening': e} for acc_id, m, e in db.session.query(DailyBalance.bank_account_id, DailyBalance.morning_balance, DailyBalance.evening_balance).filter(DailyBalance.entry_date == today).all()}
    for acc in BankAccount.query.all():
        entry = accounts_with_today_balance.get(acc.id)
        desc = f"{acc.bank.name} - {acc.name}"
        if not entry or (entry['morning'] is None and entry['evening'] is None): missing_entries.append({'id': f'balance-both-{acc.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Banka Hesap Durumu Girişi Bekleniyor', 'description': f"{desc} (Sabah/Akşam)", 'due_date': None, 'meta': {'entry_type': 'balance', 'account_id': acc.id}})
        elif entry['morning'] is None: missing_entries.append({'id': f'balance-morning-{acc.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Banka Hesap Durumu Girişi Bekleniyor', 'description': f"{desc} (Sabah)", 'due_date': None, 'meta': {'entry_type': 'balance', 'account_id': acc.id}})
        elif entry['evening'] is None: missing_entries.append({'id': f'balance-evening-{acc.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Banka Hesap Durumu Girişi Bekleniyor', 'description': f"{desc} (Akşam)", 'due_date': None, 'meta': {'entry_type': 'balance', 'account_id': acc.id}})
    kmh_with_today_risk = {kmh_id: {'morning': m, 'evening': e} for kmh_id, m, e in db.session.query(DailyRisk.kmh_limit_id, DailyRisk.morning_risk, DailyRisk.evening_risk).filter(DailyRisk.entry_date == today).all()}
    for kmh in KmhLimit.query.all():
        entry = kmh_with_today_risk.get(kmh.id)
        desc = f"{kmh.account.bank.name} - {kmh.name}"
        if not entry or (entry['morning'] is None and entry['evening'] is None): missing_entries.append({'id': f'kmh-both-{kmh.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'KMH Risk Girişi Bekleniyor', 'description': f"{desc} (Sabah/Akşam)", 'due_date': None, 'meta': {'entry_type': 'kmh', 'kmh_id': kmh.id}})
        elif entry['morning'] is None: missing_entries.append({'id': f'kmh-morning-{kmh.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'KMH Risk Girişi Bekleniyor', 'description': f"{desc} (Sabah)", 'due_date': None, 'meta': {'entry_type': 'kmh', 'kmh_id': kmh.id}})
        elif entry['evening'] is None: missing_entries.append({'id': f'kmh-evening-{kmh.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'KMH Risk Girişi Bekleniyor', 'description': f"{desc} (Akşam)", 'due_date': None, 'meta': {'entry_type': 'kmh', 'kmh_id': kmh.id}})
    cards_with_today_limit = {card_id: {'morning': m, 'evening': e} for card_id, m, e in db.session.query(DailyCreditCardLimit.credit_card_id, DailyCreditCardLimit.morning_limit, DailyCreditCardLimit.evening_limit).filter(DailyCreditCardLimit.entry_date == today).all()}
    for card in CreditCard.query.all():
        entry = cards_with_today_limit.get(card.id)
        desc = card.name
        if not entry or (entry['morning'] is None and entry['evening'] is None): missing_entries.append({'id': f'cclimit-both-{card.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Kredi Kartı Limiti Girişi Bekleniyor', 'description': f"{desc} (Sabah/Akşam)", 'due_date': None, 'meta': {'entry_type': 'cclimit', 'card_id': card.id}})
        elif entry['morning'] is None: missing_entries.append({'id': f'cclimit-morning-{card.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Kredi Kartı Limiti Girişi Bekleniyor', 'description': f"{desc} (Sabah)", 'due_date': None, 'meta': {'entry_type': 'cclimit', 'card_id': card.id}})
        elif entry['evening'] is None: missing_entries.append({'id': f'cclimit-evening-{card.id}', 'type': 'DAILY_ENTRY_MISSING', 'title': 'Kredi Kartı Limiti Girişi Bekleniyor', 'description': f"{desc} (Akşam)", 'due_date': None, 'meta': {'entry_type': 'cclimit', 'card_id': card.id}})
    return missing_entries

# --- get_upcoming_statement_dates ve get_upcoming_loan_payments fonksiyonları aynı kalıyor ---
def get_upcoming_statement_dates(today):
    due_reminders = []
    all_cards = CreditCard.query.filter(
        CreditCard.statement_day != None, 
        CreditCard.due_day != None
    ).all()

    for card in all_cards:
        try:
            # Önce bu ayın ve geçen ayın ödeme döngülerini hesaplayalım
            # Döngü 1: Bu ayki hesap kesimine ait ödeme periyodu
            statement_date_1 = date(today.year, today.month, card.statement_day)
            due_date_1 = (statement_date_1 + relativedelta(months=1)) if card.due_day < card.statement_day else statement_date_1
            due_date_1 = due_date_1.replace(day=card.due_day)

            # Döngü 2: Geçen ayki hesap kesimine ait ödeme periyodu
            statement_date_2 = statement_date_1 - relativedelta(months=1)
            due_date_2 = (statement_date_2 + relativedelta(months=1)) if card.due_day < card.statement_day else statement_date_2
            due_date_2 = due_date_2.replace(day=card.due_day)
            
            # Bugünün hangi döngüye düştüğünü kontrol et
            if statement_date_1 <= today < due_date_1:
                # Bugün, bu ayki hesap kesimi sonrası ödeme periyodunda
                due_reminders.append({
                    'id': f'cc-due-{card.id}', 'type': 'DUE_DATE_UPCOMING',
                    'title': 'Kredi Kartı Ödemesi Bekleniyor', 'description': card.name,
                    'due_date': due_date_1, 'meta': {'card_id': card.id, 'entry_type': 'cc_due'}
                })
            elif statement_date_2 <= today < due_date_2:
                # Bugün, geçen ayki hesap kesimi sonrası ödeme periyodunda
                due_reminders.append({
                    'id': f'cc-due-{card.id}', 'type': 'DUE_DATE_UPCOMING',
                    'title': 'Kredi Kartı Ödemesi Bekleniyor', 'description': card.name,
                    'due_date': due_date_2, 'meta': {'card_id': card.id, 'entry_type': 'cc_due'}
                })

        except ValueError:
            # Geçersiz bir tarih oluşturulmaya çalışılırsa (örn: 31 Nisan),
            # bu kartı atla ve döngüye devam et. Bu, uygulamanın çökmesini engeller.
            continue
            
    return due_reminders

def get_upcoming_loan_payments(today, upcoming_limit):
    upcoming_loans = db.session.query(Loan).filter(Loan.next_payment_due_date >= today, Loan.next_payment_due_date <= upcoming_limit, Loan.status != LoanStatus.PAID_IN_FULL).all()
    return [{'id': f'loan-due-{loan.id}', 'type': 'DUE_DATE_UPCOMING', 'title': 'Kredi Ödemesi Yaklaşıyor', 'description': loan.name, 'due_date': loan.next_payment_due_date, 'meta': {'loan_id': loan.id, 'entry_type': 'loan_due'}} for loan in upcoming_loans]


# --- GÜNCELLENEN FONKSİYON ---
def get_upcoming_income_due_dates(today, upcoming_limit):
    """
    Tahsilat vadesi yaklaşan gelirleri bulur.
    Açıklama olarak fatura adı yerine Müşteri Adı'nı kullanır.
    """
    upcoming_incomes = db.session.query(Income)\
        .join(Customer, Income.customer_id == Customer.id)\
        .filter(
            Income.due_date >= today,
            Income.due_date <= upcoming_limit,
            Income.status != IncomeStatus.RECEIVED
        ).all()

    return [{
        'id': f'income-due-{i.id}', 'type': 'DUE_DATE_UPCOMING',
        'title': 'Tahsilat Vadesi Yaklaşıyor',
        'description': i.customer.name, # Müşteri adını kullanıyoruz
        'due_date': i.due_date, 'meta': {'income_id': i.id, 'entry_type': 'income_due'}
    } for i in upcoming_incomes]


# --- YENİ EKLENEN FONKSİYON ---
def get_upcoming_expense_due_dates(today, upcoming_limit):
    """Son ödeme tarihi yaklaşan ve henüz ödenmemiş giderleri bulur."""
    
    # Henüz tamamen ödenmemiş durumları tanımla
    unpaid_statuses = [ExpenseStatus.UNPAID, ExpenseStatus.PARTIALLY_PAID]

    upcoming_expenses = db.session.query(Expense)\
        .join(Supplier, Expense.supplier_id == Supplier.id)\
        .filter(
            Expense.date >= today,
            Expense.date <= upcoming_limit,
            Expense.status.in_(unpaid_statuses)
        ).all()
    
    return [{
        'id': f'expense-due-{exp.id}', 'type': 'DUE_DATE_UPCOMING',
        'title': 'Gider Ödemesi Yaklaşıyor',
        'description': exp.supplier.name, # Satıcı (Tedarikçi) adını kullanıyoruz
        'due_date': exp.date, 'meta': {'expense_id': exp.id, 'entry_type': 'expense_due'}
    } for exp in upcoming_expenses]