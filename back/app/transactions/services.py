
# app/transactions/services.py
from sqlalchemy import func, case, union_all, literal_column, asc, desc, literal
from app import db
from datetime import datetime, timedelta
# Models
from app.expense.models import Payment, Expense, Supplier
from app.income.models import IncomeReceipt, Income
from app.customer.models import Customer
from app.region.models import Region
from app.budget_item.models import BudgetItem
from app.credit_cards.models import CreditCard, CreditCardTransaction, DailyCreditCardLimit
from app.loans.models import Loan, LoanPayment
from app.banks.models import DailyBalance, DailyRisk, BankAccount, Bank, KmhLimit

# --- Logging (YOUR stack) ---------------------------------------------------
# Persist per-call status/params to ServiceLog and re-raise on error
from app.logging_decorator import service_logger
# Domain logs that flow to AppLog via QueueHandler (whitelisted)
from app.logging_utils import dinfo, dwarn, derr, dinfo_sampled


@service_logger
def get_unified_transactions(filters):
    """
    Build a single paginated feed of money movements (payments, receipts,
    credit-card transactions, loan payments). Logging:
      - sampled 'enter' to reduce noise on GET lists
      - definitive 'exit' with page counters
      - errors are captured by @service_logger and global error handlers
    """
    # lightweight enter log (sampled)
    dinfo_sampled("transactions.unified.enter", **(filters or {}))

    # --- Query 1: Expense Payments ---
    payments_query = db.session.query(
        (literal_column("'payment-'") + func.cast(Payment.id, db.String)).label('id'),
        Payment.payment_date.label('date'),
        Payment.payment_amount.label('amount'),
        literal_column("'Gider'").label('category'),
        func.coalesce(Expense.invoice_number, '').label('invoice_number'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Supplier.name, 'Bilinmiyor').label('counterparty')
    ).outerjoin(Expense, Payment.expense_id == Expense.id)\
     .outerjoin(Region, Expense.region_id == Region.id)\
     .outerjoin(Supplier, Expense.supplier_id == Supplier.id)

    # --- Query 2: Income Receipts ---
    receipts_query = db.session.query(
        (literal_column("'receipt-'") + func.cast(IncomeReceipt.id, db.String)).label('id'),
        IncomeReceipt.receipt_date.label('date'),
        IncomeReceipt.receipt_amount.label('amount'),
        literal_column("'Gelir'").label('category'),
        func.coalesce(Income.invoice_number, '').label('invoice_number'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Customer.name, 'Bilinmiyor').label('counterparty')
    ).outerjoin(Income, IncomeReceipt.income_id == Income.id)\
     .outerjoin(Region, Income.region_id == Region.id)\
     .outerjoin(Customer, Income.customer_id == Customer.id)

    # --- Query 3: Credit Card Transactions ---
    cc_transactions_query = db.session.query(
        (literal_column("'cct-'") + func.cast(CreditCardTransaction.id, db.String)).label('id'),
        CreditCardTransaction.transaction_date.label('date'),
        CreditCardTransaction.amount.label('amount'),
        case(
            (CreditCardTransaction.type == 'PAYMENT', 'Kredi Kartı Ödemesi'),
            else_='Kredi Kartı Harcaması'
        ).label('category'),
        func.coalesce(CreditCardTransaction.description, '').label('invoice_number'),
        literal_column("'Bilinmiyor'").label('region'),
        func.coalesce(CreditCard.name, 'Bilinmeyen Kart').label('counterparty')
    ).outerjoin(CreditCard, CreditCardTransaction.credit_card_id == CreditCard.id)

    # --- Query 4: Loan Payments ---
    loan_payments_query = db.session.query(
        (literal_column("'loanpayment-'") + func.cast(LoanPayment.id, db.String)).label('id'),
        LoanPayment.payment_date.label('date'),
        LoanPayment.amount_paid.label('amount'),
        literal_column("'Kredi Ödemesi'").label('category'),
        func.coalesce(LoanPayment.notes, '').label('invoice_number'),
        literal_column("'Bilinmiyor'").label('region'),
        func.coalesce(Loan.name, 'Bilinmeyen Kredi').label('counterparty')
    ).outerjoin(Loan, LoanPayment.loan_id == Loan.id)

    # --- UNION ALL ---
    unified_query_stmt = union_all(
        payments_query,
        receipts_query,
        cc_transactions_query,
        loan_payments_query
    ).alias('transactions')

    query = db.session.query(unified_query_stmt)

    # --- Filters ---
    if filters.get('startDate'):
        query = query.filter(unified_query_stmt.c.date >= filters['startDate'])
    if filters.get('endDate'):
        query = query.filter(unified_query_stmt.c.date <= filters['endDate'])
    if filters.get('categories'):
        category_list = filters['categories'].split(',')
        query = query.filter(unified_query_stmt.c.category.in_(category_list))
    if filters.get('q'):
        search_term = f"%{filters['q'].lower()}%"
        query = query.filter(
            db.or_(
                func.lower(func.coalesce(unified_query_stmt.c.counterparty, '')).like(search_term),
                func.lower(func.coalesce(unified_query_stmt.c.invoice_number, '')).like(search_term)
            )
        )

    sort_by = filters.get('sort_by', 'date')
    sort_order = filters.get('sort_order', 'desc')

    sortable_columns = {
        'date': unified_query_stmt.c.date,
        'category': unified_query_stmt.c.category,
        'counterparty': unified_query_stmt.c.counterparty,
        'amount': unified_query_stmt.c.amount
    }

    if sort_by in sortable_columns:
        column_to_sort = sortable_columns[sort_by]
        query = query.order_by(asc(column_to_sort) if sort_order == 'asc' else desc(column_to_sort))

    # --- Pagination ---
    page = int(filters.get('page', 1))
    per_page = int(filters.get('per_page', 20))
    paginated_result = query.paginate(page=page, per_page=per_page, error_out=False)

    # definitive exit log (not sampled): includes total/page counters
    dinfo("transactions.unified.exit",
          total=paginated_result.total,
          page=page, per_page=per_page,
          sort_by=sort_by, sort_order=sort_order,
          has_query=bool(filters.get('q')),
          categories=filters.get('categories'))

    return paginated_result


@service_logger
def get_unified_daily_entries(filters):
    """
    Merge daily balances, KMH risks and CC limits into a single paginated feed.
    Same logging strategy as above.
    """
    dinfo_sampled("transactions.daily.enter", **(filters or {}))

    # --- Bank Balances (morning/evening) ---
    balance_morning_query = db.session.query(
        (literal_column("'balance-morning-'") + func.cast(DailyBalance.id, db.String)).label('id'),
        DailyBalance.entry_date.label('entry_date'),
        literal_column("'Banka Bakiye'").label('category'),
        func.coalesce(Bank.name, 'Bilinmiyor').label('bank_name'),
        func.coalesce(BankAccount.name, 'Bilinmiyor').label('account_name'),
        DailyBalance.morning_balance.label('amount'),
        literal_column("'Sabah'").label('period')
    ).outerjoin(BankAccount, DailyBalance.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)\
     .filter(DailyBalance.morning_balance.isnot(None))

    balance_evening_query = db.session.query(
        (literal_column("'balance-evening-'") + func.cast(DailyBalance.id, db.String)).label('id'),
        DailyBalance.entry_date.label('entry_date'),
        literal_column("'Banka Bakiye'").label('category'),
        func.coalesce(Bank.name, 'Bilinmiyor').label('bank_name'),
        func.coalesce(BankAccount.name, 'Bilinmiyor').label('account_name'),
        DailyBalance.evening_balance.label('amount'),
        literal_column("'Akşam'").label('period')
    ).outerjoin(BankAccount, DailyBalance.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)\
     .filter(DailyBalance.evening_balance.isnot(None))

    # --- KMH Risks (morning/evening) ---
    risk_morning_query = db.session.query(
        (literal_column("'risk-morning-'") + func.cast(DailyRisk.id, db.String)).label('id'),
        DailyRisk.entry_date.label('entry_date'),
        literal_column("'KMH Limiti'").label('category'),
        func.coalesce(Bank.name, 'Bilinmiyor').label('bank_name'),
        func.coalesce(KmhLimit.name, 'Bilinmiyor').label('account_name'),
        DailyRisk.morning_risk.label('amount'),
        literal_column("'Sabah'").label('period')
    ).outerjoin(KmhLimit, DailyRisk.kmh_limit_id == KmhLimit.id)\
     .outerjoin(BankAccount, KmhLimit.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)\
     .filter(DailyRisk.morning_risk.isnot(None))

    risk_evening_query = db.session.query(
        (literal_column("'risk-evening-'") + func.cast(DailyRisk.id, db.String)).label('id'),
        DailyRisk.entry_date.label('entry_date'),
        literal_column("'KMH Limiti'").label('category'),
        func.coalesce(Bank.name, 'Bilinmiyor').label('bank_name'),
        func.coalesce(KmhLimit.name, 'Bilinmiyor').label('account_name'),
        DailyRisk.evening_risk.label('amount'),
        literal_column("'Akşam'").label('period')
    ).outerjoin(KmhLimit, DailyRisk.kmh_limit_id == KmhLimit.id)\
     .outerjoin(BankAccount, KmhLimit.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)\
     .filter(DailyRisk.evening_risk.isnot(None))

    # --- Credit Card Limits (morning/evening) ---
    cc_limit_morning_query = db.session.query(
        (literal_column("'cclimit-morning-'") + func.cast(DailyCreditCardLimit.id, db.String)).label('id'),
        DailyCreditCardLimit.entry_date.label('entry_date'),
        literal_column("'Kredi Kartı Limiti'").label('category'),
        func.coalesce(Bank.name, 'Bilinmiyor').label('bank_name'),
        func.coalesce(CreditCard.name, 'Bilinmiyor').label('account_name'),
        DailyCreditCardLimit.morning_limit.label('amount'),
        literal_column("'Sabah'").label('period')
    ).outerjoin(CreditCard, DailyCreditCardLimit.credit_card_id == CreditCard.id)\
     .outerjoin(BankAccount, CreditCard.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)\
     .filter(DailyCreditCardLimit.morning_limit.isnot(None))

    cc_limit_evening_query = db.session.query(
        (literal_column("'cclimit-evening-'") + func.cast(DailyCreditCardLimit.id, db.String)).label('id'),
        DailyCreditCardLimit.entry_date.label('entry_date'),
        literal_column("'Kredi Kartı Limiti'").label('category'),
        func.coalesce(Bank.name, 'Bilinmiyor').label('bank_name'),
        func.coalesce(CreditCard.name, 'Bilinmiyor').label('account_name'),
        DailyCreditCardLimit.evening_limit.label('amount'),
        literal_column("'Akşam'").label('period')
    ).outerjoin(CreditCard, DailyCreditCardLimit.credit_card_id == CreditCard.id)\
     .outerjoin(BankAccount, CreditCard.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)\
     .filter(DailyCreditCardLimit.evening_limit.isnot(None))

    # --- UNION ALL ---
    unified_query_stmt = union_all(
        balance_morning_query, balance_evening_query,
        risk_morning_query, risk_evening_query,
        cc_limit_morning_query, cc_limit_evening_query
    ).alias('daily_entries')

    query = db.session.query(unified_query_stmt)

    # --- Filters ---
    if filters.get('startDate'):
        query = query.filter(unified_query_stmt.c.entry_date >= filters['startDate'])
    if filters.get('endDate'):
        query = query.filter(unified_query_stmt.c.entry_date <= filters['endDate'])
    if filters.get('categories'):
        category_list = filters['categories'].split(',')
        query = query.filter(unified_query_stmt.c.category.in_(category_list))
    if filters.get('q'):
        search_term = f"%{filters['q'].lower()}%"
        query = query.filter(
            db.or_(
                func.lower(func.coalesce(unified_query_stmt.c.bank_name, '')).like(search_term),
                func.lower(func.coalesce(unified_query_stmt.c.account_name, '')).like(search_term)
            )
        )

    sort_by = filters.get('sort_by', 'entry_date')
    sort_order = filters.get('sort_order', 'desc')

    sortable_columns = {
        'date': unified_query_stmt.c.entry_date,   # front 'date' -> DB 'entry_date'
        'period': unified_query_stmt.c.period,
        'category': unified_query_stmt.c.category,
        'bank_name': unified_query_stmt.c.bank_name,
        'account_name': unified_query_stmt.c.account_name,
        'amount': unified_query_stmt.c.amount
    }

    if sort_by in sortable_columns:
        column_to_sort = sortable_columns[sort_by]
        query = query.order_by(asc(column_to_sort) if sort_order == 'asc' else desc(column_to_sort))
    else:
        # default: newest date first, then evening after morning
        query = query.order_by(desc(unified_query_stmt.c.entry_date), desc(unified_query_stmt.c.period))

    # --- Pagination ---
    page = int(filters.get('page', 1))
    per_page = int(filters.get('per_page', 20))
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    dinfo("transactions.daily.exit",
          total=paginated.total,
          page=page, per_page=per_page,
          sort_by=sort_by, sort_order=sort_order,
          has_query=bool(filters.get('q')),
          categories=filters.get('categories'))

    return paginated

@service_logger
def get_unified_activity_feed(filters):
    """
    Tüm sistem olaylarını (gelir/gider/kk/kredi ekleme) birleştirir.
    Kredi kartı ve kredi için banka adı yerine kendi isimlerini kullanır.
    """
    # --- Sorgu 1: Yeni Gelirler (Değişiklik yok) ---
    income_query = db.session.query(
        (literal("income-") + func.cast(Income.id, db.String)).label('id'),
        Income.created_at.label('event_date'),
        literal("Gelir Eklendi").label('category'),
        Income.total_amount.label('amount'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Customer.name, 'İlişki Yok').label('bank_or_company')
    ).outerjoin(Customer, Income.customer_id == Customer.id)\
     .outerjoin(Region, Income.region_id == Region.id)

    # --- Sorgu 2: Yeni Giderler (Değişiklik yok) ---
    expense_query = db.session.query(
        (literal("expense-") + func.cast(Expense.id, db.String)).label('id'),
        Expense.created_at.label('event_date'),
        literal("Gider Eklendi").label('category'),
        Expense.amount.label('amount'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Supplier.name, 'İlişki Yok').label('bank_or_company')
    ).outerjoin(Supplier, Expense.supplier_id == Supplier.id)\
     .outerjoin(Region, Expense.region_id == Region.id)

    # --- Sorgu 3: Yeni Kredi Kartları (Güncellendi) ---
    credit_card_query = db.session.query(
        (literal("creditcard-") + func.cast(CreditCard.id, db.String)).label('id'),
        CreditCard.created_at.label('event_date'),
        literal("Kredi Kartı Eklendi").label('category'),
        CreditCard.limit.label('amount'),
        literal(None).label('region'), # Şema ile uyumluluk için None ekliyoruz
        func.coalesce(CreditCard.name, 'İlişki Yok').label('bank_or_company') # <<== DEĞİŞTİ
    ).outerjoin(BankAccount, CreditCard.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)

    # --- Sorgu 4: Yeni Krediler (Güncellendi) ---
    loan_query = db.session.query(
        (literal("loan-") + func.cast(Loan.id, db.String)).label('id'),
        Loan.created_at.label('event_date'),
        literal("Kredi Eklendi").label('category'),
        Loan.amount_drawn.label('amount'),
        literal(None).label('region'), # Şema ile uyumluluk için None ekliyoruz
        func.coalesce(Loan.name, 'İlişki Yok').label('bank_or_company') # <<== DEĞİŞTİ
    ).outerjoin(BankAccount, Loan.bank_account_id == BankAccount.id)\
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)

    # --- Tüm Sorguları Veritabanında Birleştir (UNION ALL) ---
    unified_query_stmt = union_all(
        income_query, expense_query, credit_card_query, loan_query
    ).alias('activities')
    
    query = db.session.query(unified_query_stmt)

    # --- Filtreleme Mantığı (Değişiklik yok) ---
    if filters.get('startDate'):
        start_date = datetime.strptime(filters['startDate'], '%Y-%m-%d').date()
        query = query.filter(unified_query_stmt.c.event_date >= start_date)
    if filters.get('endDate'):
        end_date = datetime.strptime(filters['endDate'], '%Y-%m-%d').date()
        next_day = end_date + timedelta(days=1)
        query = query.filter(unified_query_stmt.c.event_date < next_day)
    if filters.get('categories'):
        query = query.filter(unified_query_stmt.c.category.in_(filters['categories'].split(',')))
    if filters.get('q'):
        search_term = f"%{filters['q'].lower()}%"
        query = query.filter(func.lower(func.coalesce(unified_query_stmt.c.bank_or_company, '')).like(search_term))

    # --- Sıralama Mantığı (Değişiklik yok) ---
    sort_by = filters.get('sort_by', 'event_date')
    sort_order = filters.get('sort_order', 'desc')
    if hasattr(unified_query_stmt.c, sort_by):
        column_to_sort = getattr(unified_query_stmt.c, sort_by)
        query = query.order_by(asc(column_to_sort) if sort_order == 'asc' else desc(column_to_sort))
    
    # --- Sayfalama veya Limit (Değişiklik yok) ---
    if filters.get('limit'):
        # Bu kısım `get_dashboard_feed` tarafından kullanılmıyor artık
        # ama başka bir yerde kullanılma ihtimaline karşı bırakıyoruz.
        return {"items": query.limit(int(filters.get('limit'))).all()}
    else:
        page = int(filters.get('page', 1))
        per_page = int(filters.get('per_page', 15))
        return query.paginate(page=page, per_page=per_page, error_out=False)
@service_logger
def get_dashboard_feed():
    """ 
    Ana sayfadaki "Son İşlemler" için YÜKSEK PERFORMANSLI ve GÜVENLİ birleşik akışı çeker.
    Strateji: 
    1. Her tablodan tarihi NULL olmayan en yeni 5 kaydı ayrı ayrı çek.
    2. Python'da birleştir.
    3. Çökmeyi önlemek için güvenli sıralama yap.
    """
    
    # 1. Adım: Her kayaptan en yeni 5 kaydı al (Şema ile tam uyumlu)
    
    # GELİR SORGUSU
    # NOT: Sorgu parantez içine alındı ve sondaki ters eğik çizgiler kaldırıldı.
    income_query = (db.session.query(
        (literal("income-") + func.cast(Income.id, db.String)).label('id'),
        Income.created_at.label('event_date'),
        literal("Gelir Eklendi").label('category'),
        func.coalesce(Customer.name, 'İlişki Yok').label('description'),
        Income.total_amount.label('amount'),
        literal(None).label('currency'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Customer.name, 'İlişki Yok').label('bank_or_company')
    ).outerjoin(Customer, Income.customer_id == Customer.id)
     .outerjoin(Region, Income.region_id == Region.id)
     .filter(Income.created_at.isnot(None)) # Güvenlik filtresi
     .order_by(desc(Income.created_at))
     .limit(5).all())

    # GİDER SORGUSU
    # NOT: Sorgu parantez içine alındı ve sondaki ters eğik çizgiler kaldırıldı.
    expense_query = (db.session.query(
        (literal("expense-") + func.cast(Expense.id, db.String)).label('id'),
        Expense.created_at.label('event_date'),
        literal("Gider Eklendi").label('category'),
        func.coalesce(Supplier.name, 'İlişki Yok').label('description'),
        Expense.amount.label('amount'),
        literal(None).label('currency'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Supplier.name, 'İlişki Yok').label('bank_or_company')
    ).outerjoin(Supplier, Expense.supplier_id == Supplier.id)
     .outerjoin(Region, Expense.region_id == Region.id)
     .filter(Expense.created_at.isnot(None)) # Güvenlik filtresi
     .order_by(desc(Expense.created_at))
     .limit(5).all())

    # KREDİ KARTI SORGUSU (Güncellendi)
    credit_card_query = (db.session.query(
        (literal("creditcard-") + func.cast(CreditCard.id, db.String)).label('id'),
        CreditCard.created_at.label('event_date'),
        literal("Kredi Kartı Eklendi").label('category'),
        func.coalesce(CreditCard.name, 'İlişki Yok').label('description'), # <<== DEĞİŞTİ: Banka adı yerine kartın kendi adı
        CreditCard.limit.label('amount'),
        literal(None).label('currency'),
        literal(None).label('region'),
        func.coalesce(CreditCard.name, 'İlişki Yok').label('bank_or_company') # <<== DEĞİŞTİ: Banka adı yerine kartın kendi adı
    ).outerjoin(BankAccount, CreditCard.bank_account_id == BankAccount.id)
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)
     .filter(CreditCard.created_at.isnot(None)) 
     .order_by(desc(CreditCard.created_at))
     .limit(5).all())
     
    # KREDİ SORGUSU (Güncellendi)
    loan_query = (db.session.query(
        (literal("loan-") + func.cast(Loan.id, db.String)).label('id'),
        Loan.created_at.label('event_date'),
        literal("Kredi Eklendi").label('category'),
        func.coalesce(Loan.name, 'İlişki Yok').label('description'), # <<== DEĞİŞTİ: Banka adı yerine kredinin kendi adı
        Loan.amount_drawn.label('amount'),
        literal(None).label('currency'),
        literal(None).label('region'),
        func.coalesce(Loan.name, 'İlişki Yok').label('bank_or_company') # <<== DEĞİŞTİ: Banka adı yerine kredinin kendi adı
    ).outerjoin(BankAccount, Loan.bank_account_id == BankAccount.id)
     .outerjoin(Bank, BankAccount.bank_id == Bank.id)
     .filter(Loan.created_at.isnot(None))
     .order_by(desc(Loan.created_at))
     .limit(5).all())

    # 2. Adım: Tüm sonuçları tek bir listede birleştir
    all_activities = income_query + expense_query + credit_card_query + loan_query
    
    # 3. Adım: Güvenli sıralama (çökmeyi önleyen sigorta)
    all_activities.sort(key=lambda item: item.event_date or datetime.min, reverse=True)
    
    # 4. Adım: En yeni ilk 5 öğeyi al
    final_items_raw = all_activities[:5]

    # 5. Adım: Listeyi Marshmallow'un anlayacağı sözlük formatına çevir
    final_items_dict = [item._asdict() for item in final_items_raw]
    
    # 6. Adım: Sözlük listesini döndür
    return {"items": final_items_dict}