
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
    Tüm para hareketlerini birleştirir. Bu versiyon, sağlanan tüm modellerle
    tam uyumlu olacak şekilde yeniden yazılmıştır.
    """
    dinfo_sampled("transactions.unified.enter", **(filters or {}))
    
    # --- Tarih Filtreleme ---
    end_date_raw = filters.get('endDate')
    start_date_raw = filters.get('startDate')
    if end_date_raw:
        end_date = datetime.strptime(end_date_raw, '%Y-%m-%d')
    else:
        end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if start_date_raw:
        start_date = datetime.strptime(start_date_raw, '%Y-%m-%d')
    else:
        start_date = end_date - timedelta(days=7)
    end_date_for_filter = end_date + timedelta(days=1)

    # --- Query 1: Expense Payments (Gider Ödemeleri) ---
    # Model'e göre: Şirket Adı -> Supplier.name, Açıklama -> Payment.description
    payments_query = db.session.query(
        (literal('payment-') + func.cast(Payment.id, db.String)).label('id'),
        Payment.created_at.label('date'),
        Payment.payment_amount.label('amount'),
        literal("Gider Ödemesi").label('category'),
        func.coalesce(Supplier.name, 'Bilinmiyor').label('bank_or_company'),
        func.coalesce(Payment.description, None).label('description'), 
        func.coalesce(Expense.invoice_number, None).label('invoice_number'),
        func.coalesce(Region.name, None).label('region'),
        func.cast(Expense.currency, db.String).label('currency')
    ).join(Expense, Payment.expense_id == Expense.id)\
     .outerjoin(Region, Expense.region_id == Region.id)\
     .outerjoin(Supplier, Expense.supplier_id == Supplier.id)\
     .filter(Payment.created_at.isnot(None))\
     .filter(Payment.created_at >= start_date, Payment.created_at < end_date_for_filter)

    # --- Query 2: Income Receipts (Gelir Tahsilatları) ---
    # Model'e göre: Şirket Adı -> Customer.name, Açıklama -> IncomeReceipt.notes
    receipts_query = db.session.query(
        (literal('receipt-') + func.cast(IncomeReceipt.id, db.String)).label('id'),
        IncomeReceipt.created_at.label('date'),
        IncomeReceipt.receipt_amount.label('amount'),
        literal("Gelir Tahsilatı").label('category'),
        func.coalesce(Customer.name, 'Bilinmiyor').label('bank_or_company'),
        func.coalesce(IncomeReceipt.notes, None).label('description'),
        func.coalesce(Income.invoice_number, None).label('invoice_number'),
        func.coalesce(Region.name, None).label('region'),
        func.cast(Income.currency, db.String).label('currency')
    ).join(Income, IncomeReceipt.income_id == Income.id)\
     .outerjoin(Region, Income.region_id == Region.id)\
     .outerjoin(Customer, Income.customer_id == Customer.id)\
     .filter(IncomeReceipt.created_at.isnot(None))\
     .filter(IncomeReceipt.created_at >= start_date, IncomeReceipt.created_at < end_date_for_filter)

    # --- Query 3: Credit Card Transactions ---
    # Model'e göre: Banka/Şirket -> CreditCard.name, Açıklama -> CreditCardTransaction.description
    cc_transactions_query = db.session.query(
        (literal('cct-') + func.cast(CreditCardTransaction.id, db.String)).label('id'),
        CreditCardTransaction.created_at.label('date'),
        CreditCardTransaction.amount.label('amount'),
        case(
            (CreditCardTransaction.type == 'PAYMENT', 'Kredi Kartı Ödemesi'),
            else_='Kredi Kartı Harcaması'
        ).label('category'),
        func.coalesce(CreditCard.name, 'Bilinmeyen Kart').label('bank_or_company'),
        func.coalesce(CreditCardTransaction.description, None).label('description'),
        literal(None).label('invoice_number'), 
        literal(None).label('region'),
        literal('TRY').label('currency')
    ).join(CreditCard, CreditCardTransaction.credit_card_id == CreditCard.id)\
     .filter(CreditCardTransaction.created_at.isnot(None))\
     .filter(CreditCardTransaction.created_at >= start_date, CreditCardTransaction.created_at < end_date_for_filter)

    # --- Query 4: Loan Payments ---
    # Model'e göre: Banka/Şirket -> Loan.name, Açıklama -> LoanPayment.notes
    loan_payments_query = db.session.query(
        (literal('loanpayment-') + func.cast(LoanPayment.id, db.String)).label('id'),
        LoanPayment.created_at.label('date'),
        LoanPayment.amount_paid.label('amount'),
        literal("Kredi Ödemesi").label('category'),
        func.coalesce(Loan.name, 'Bilinmeyen Kredi').label('bank_or_company'),
        func.coalesce(LoanPayment.notes, None).label('description'),
        literal(None).label('invoice_number'),
        literal(None).label('region'),
        literal('TRY').label('currency')
    ).join(Loan, LoanPayment.loan_id == Loan.id)\
     .filter(LoanPayment.created_at.isnot(None))\
     .filter(LoanPayment.created_at >= start_date, LoanPayment.created_at < end_date_for_filter)

    # --- UNION ALL ---
    unified_query_stmt = union_all(
        payments_query,
        receipts_query,
        cc_transactions_query,
        loan_payments_query
    ).alias('transactions')

    query = db.session.query(unified_query_stmt)

    # --- Filtreleme, Sıralama ve Sayfalama ---
    if filters.get('categories'):
        category_list = [cat.strip() for cat in filters['categories'].split(',')]
        query = query.filter(unified_query_stmt.c.category.in_(category_list))
    if filters.get('q'):
        search_term = f"%{filters['q'].lower()}%"
        query = query.filter(
            db.or_(
                func.lower(func.coalesce(unified_query_stmt.c.bank_or_company, '')).like(search_term),
                func.lower(func.coalesce(unified_query_stmt.c.description, '')).like(search_term),
                func.lower(func.coalesce(unified_query_stmt.c.invoice_number, '')).like(search_term)
            )
        )

    sort_by = filters.get('sort_by', 'date')
    sort_order = filters.get('sort_order', 'desc')
    sortable_columns = {
        'date': unified_query_stmt.c.date,
        'category': unified_query_stmt.c.category,
        'bank_or_company': unified_query_stmt.c.bank_or_company,
        'description': unified_query_stmt.c.description,
        'amount': unified_query_stmt.c.amount
    }
    if sort_by in sortable_columns:
        column_to_sort = sortable_columns[sort_by]
        query = query.order_by(asc(column_to_sort) if sort_order == 'asc' else desc(column_to_sort))

    page = int(filters.get('page', 1))
    per_page = int(filters.get('per_page', 20))
    paginated_result = query.paginate(page=page, per_page=per_page, error_out=False)
    
    dinfo("transactions.unified.exit", total=paginated_result.total)
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
    Tüm sistem olaylarını birleştirir.
    OPTIMIZED & FIXED: Tarih filtreleri performans için UNION öncesi alt sorgulara taşındı
    ve bitiş tarihi mantığı düzeltildi.
    """
    start_date_str = filters.get('startDate')
    end_date_str = filters.get('endDate')
    
    # Tarih string'lerini datetime objelerine çeviriyoruz (gece yarısı olarak)
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d') if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d') if end_date_str else None
    
    # --- Sorgu 1: Yeni Gelirler ---
    income_query = (db.session.query(
        # ... (sorgunun select kısmı aynı, bir önceki versiyondan kopyalayın) ...
        (literal("income-") + func.cast(Income.id, db.String)).label('id'),
        Income.created_at.label('event_date'),
        literal("Gelir Eklendi").label('category'),
        Income.total_amount.label('amount'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Customer.name, 'İlişki Yok').label('bank_or_company'),
        func.cast(Income.currency, db.String).label('currency')
    ).outerjoin(Customer, Income.customer_id == Customer.id)
     .outerjoin(Region, Income.region_id == Region.id))\
      .filter(Income.created_at.isnot(None))
      
    # <<== DÜZELTİLMİŞ FİLTRELEME
    if start_date:
        income_query = income_query.filter(Income.created_at >= start_date)
    if end_date:
        # Bitiş gününü de dahil etmek için ertesi günün başlangıcını kullanıyoruz
        next_day = end_date + timedelta(days=1)
        income_query = income_query.filter(Income.created_at < next_day)

    # --- Sorgu 2: Yeni Giderler ---
    expense_query = (db.session.query(
        # ... (sorgunun select kısmı aynı) ...
        (literal("expense-") + func.cast(Expense.id, db.String)).label('id'),
        Expense.created_at.label('event_date'),
        literal("Gider Eklendi").label('category'),
        Expense.amount.label('amount'),
        func.coalesce(Region.name, 'Bilinmiyor').label('region'),
        func.coalesce(Supplier.name, 'İlişki Yok').label('bank_or_company'),
        func.cast(Expense.currency, db.String).label('currency')
    ).outerjoin(Supplier, Expense.supplier_id == Supplier.id)
     .outerjoin(Region, Expense.region_id == Region.id))\
     .filter(Income.created_at.isnot(None))
     
    # <<== DÜZELTİLMİŞ FİLTRELEME
    if start_date:
        expense_query = expense_query.filter(Expense.created_at >= start_date)
    if end_date:
        next_day = end_date + timedelta(days=1)
        expense_query = expense_query.filter(Expense.created_at < next_day)

    # --- Sorgu 3: Yeni Kredi Kartları ---
    credit_card_query = (db.session.query(
        # ... (sorgunun select kısmı aynı) ...
        (literal("creditcard-") + func.cast(CreditCard.id, db.String)).label('id'),
        CreditCard.created_at.label('event_date'),
        literal("Kredi Kartı Eklendi").label('category'),
        CreditCard.limit.label('amount'),
        literal(None).label('region'),
        func.coalesce(CreditCard.name, 'İlişki Yok').label('bank_or_company'),
        literal('TRY').label('currency')
    ).outerjoin(BankAccount, CreditCard.bank_account_id == BankAccount.id)
     .outerjoin(Bank, BankAccount.bank_id == Bank.id))\
     .filter(CreditCard.created_at.isnot(None))
     
    # <<== DÜZELTİLMİŞ FİLTRELEME
    if start_date:
        credit_card_query = credit_card_query.filter(CreditCard.created_at >= start_date)
    if end_date:
        next_day = end_date + timedelta(days=1)
        credit_card_query = credit_card_query.filter(CreditCard.created_at < next_day)

    # --- Sorgu 4: Yeni Krediler ---
    loan_query = (db.session.query(
        # ... (sorgunun select kısmı aynı) ...
        (literal("loan-") + func.cast(Loan.id, db.String)).label('id'),
        Loan.created_at.label('event_date'),
        literal("Kredi Eklendi").label('category'),
        Loan.amount_drawn.label('amount'),
        literal(None).label('region'),
        func.coalesce(Loan.name, 'İlişki Yok').label('bank_or_company'),
        literal('TRY').label('currency')
    ).outerjoin(BankAccount, Loan.bank_account_id == BankAccount.id)
     .outerjoin(Bank, BankAccount.bank_id == Bank.id))\
     .filter(Loan.created_at.isnot(None))
    
    # <<== DÜZELTİLMİŞ FİLTRELEME
    if start_date:
        loan_query = loan_query.filter(Loan.created_at >= start_date)
    if end_date:
        next_day = end_date + timedelta(days=1)
        loan_query = loan_query.filter(Loan.created_at < next_day)


    # --- UNION ALL ve sonrası aynı ---
    unified_query_stmt = union_all(
        income_query, expense_query, credit_card_query, loan_query
    ).alias('activities')
    
    query = db.session.query(unified_query_stmt)
    
    if filters.get('categories'):
        query = query.filter(unified_query_stmt.c.category.in_(filters['categories'].split(',')))
    if filters.get('q'):
        search_term = f"%{filters['q'].lower()}%"
        query = query.filter(func.lower(func.coalesce(unified_query_stmt.c.bank_or_company, '')).like(search_term))

    sort_by = filters.get('sort_by', 'event_date')
    sort_order = filters.get('sort_order', 'desc')
    if hasattr(unified_query_stmt.c, sort_by):
        column_to_sort = getattr(unified_query_stmt.c, sort_by)
        query = query.order_by(asc(column_to_sort) if sort_order == 'asc' else desc(column_to_sort))
    
    if filters.get('limit'):
        return {"items": query.limit(int(filters.get('limit'))).all()}
    else:
        page = int(filters.get('page', 1))
        per_page = int(filters.get('per_page', 15))
        return query.paginate(page=page, per_page=per_page, error_out=False)
@service_logger
def get_dashboard_feed():
    """ 
    Ana sayfadaki "Son İşlemler" için tüm olayları içeren, veritabanı seviyesinde 
    birleştirilmiş, YÜKSEK PERFORMANSLI ve SAĞLAM birleşik akışı çeker.
    """
    
    # 1. Her olay türü için en yeni 5 kaydı çeken alt sorgular tanımlanır.
    # Her sorgu, UnifiedActivitySchema ile %100 uyumlu alanlar döndürmelidir.
    
    income_q = (db.session.query(
        (literal("income-") + func.cast(Income.id, db.String)).label('id'),
        Income.created_at.label('event_date'),
        literal("Gelir Eklendi").label('category'),
        func.coalesce(Customer.name, 'İlişki Yok').label('description'),
        Income.total_amount.label('amount'),
        func.cast(Income.currency, db.String).label('currency')
    ).outerjoin(Customer, Income.customer_id == Customer.id)
     .filter(Income.created_at.isnot(None))
     .order_by(desc(Income.created_at)).limit(5))

    expense_q = (db.session.query(
        (literal("expense-") + func.cast(Expense.id, db.String)).label('id'),
        Expense.created_at.label('event_date'),
        literal("Gider Eklendi").label('category'),
        func.coalesce(Supplier.name, 'İlişki Yok').label('description'),
        Expense.amount.label('amount'),
        func.cast(Expense.currency, db.String).label('currency')
    ).outerjoin(Supplier, Expense.supplier_id == Supplier.id)
     .filter(Expense.created_at.isnot(None))
     .order_by(desc(Expense.created_at)).limit(5))

    receipt_q = (db.session.query(
        (literal("receipt-") + func.cast(IncomeReceipt.id, db.String)).label('id'),
        IncomeReceipt.created_at.label('event_date'),
        literal("Gelir Tahsilatı").label('category'),
        func.coalesce(Customer.name, 'İlişki Yok').label('description'),
        IncomeReceipt.receipt_amount.label('amount'),
        func.cast(Income.currency, db.String).label('currency')
    ).join(Income, IncomeReceipt.income_id == Income.id)
     .outerjoin(Customer, Income.customer_id == Customer.id)
     .filter(IncomeReceipt.created_at.isnot(None))
     .order_by(desc(IncomeReceipt.created_at)).limit(5))

    payment_q = (db.session.query(
        (literal("payment-") + func.cast(Payment.id, db.String)).label('id'),
        Payment.created_at.label('event_date'),
        literal("Gider Ödemesi").label('category'),
        func.coalesce(Supplier.name, 'İlişki Yok').label('description'),
        Payment.payment_amount.label('amount'),
        func.cast(Expense.currency, db.String).label('currency')
    ).join(Expense, Payment.expense_id == Expense.id)
     .outerjoin(Supplier, Expense.supplier_id == Supplier.id)
     .filter(Payment.created_at.isnot(None))
     .order_by(desc(Payment.created_at)).limit(5))

    # 5. Kredi Kartı İşlemleri Sorgusu (Harçama ve Ödeme)
    cct_q = (db.session.query(
        (literal("cct-") + func.cast(CreditCardTransaction.id, db.String)).label('id'),
        CreditCardTransaction.created_at.label('event_date'),
        case(
            (CreditCardTransaction.type == 'PAYMENT', 'Kredi Kartı Ödemesi'),
            else_='Kredi Kartı Harcaması'
        ).label('category'),
        func.coalesce(CreditCard.name, 'Bilinmeyen Kart').label('description'),
        CreditCardTransaction.amount.label('amount'),
        literal('TRY').label('currency')
    ).join(CreditCard, CreditCardTransaction.credit_card_id == CreditCard.id)
      .filter(CreditCardTransaction.created_at.isnot(None))
      .order_by(desc(CreditCardTransaction.created_at)).limit(5))

    # 6. Kredi Ödemeleri Sorgusu
    loan_payment_q = (db.session.query(
        (literal("loanpayment-") + func.cast(LoanPayment.id, db.String)).label('id'),
        LoanPayment.created_at.label('event_date'),
        literal("Kredi Ödemesi").label('category'),
        func.coalesce(Loan.name, 'Bilinmeyen Kredi').label('description'),
        LoanPayment.amount_paid.label('amount'),
        literal('TRY').label('currency')
    ).join(Loan, LoanPayment.loan_id == Loan.id)
      .filter(LoanPayment.created_at.isnot(None))
      .order_by(desc(LoanPayment.created_at)).limit(5))
    
    # 7. Yeni Kredi Kartı Ekleme Sorgusu
    credit_card_add_q = (db.session.query(
        (literal("creditcard-") + func.cast(CreditCard.id, db.String)).label('id'),
        CreditCard.created_at.label('event_date'),
        literal("Kredi Kartı Eklendi").label('category'),
        func.coalesce(CreditCard.name, 'Bilinmeyen Kart').label('description'),
        CreditCard.limit.label('amount'),
        literal('TRY').label('currency')
    ).outerjoin(BankAccount, CreditCard.bank_account_id == BankAccount.id)
      .outerjoin(Bank, BankAccount.bank_id == Bank.id)
      .filter(CreditCard.created_at.isnot(None))
      .order_by(desc(CreditCard.created_at)).limit(5))
    
    # 8. Yeni Kredi Ekleme Sorgusu
    loan_add_q = (db.session.query(
        (literal("loan-") + func.cast(Loan.id, db.String)).label('id'),
        Loan.created_at.label('event_date'),
        literal("Kredi Eklendi").label('category'),
        func.coalesce(Loan.name, 'Bilinmeyen Kredi').label('description'),
        Loan.amount_drawn.label('amount'),
        literal('TRY').label('currency')
    ).outerjoin(BankAccount, Loan.bank_account_id == BankAccount.id)
      .outerjoin(Bank, BankAccount.bank_id == Bank.id)
      .filter(Loan.created_at.isnot(None))
      .order_by(desc(Loan.created_at)).limit(5))


    # 2. Tüm bu küçük ve hızlı sorgular veritabanında birleştirilir.
    unified_query = union_all(
        income_q, expense_q, receipt_q, payment_q, cct_q, loan_payment_q,
        credit_card_add_q, loan_add_q
    ).alias('recent_events')

    # 3. Birleştirilmiş sonuçtan en yeni 5 tanesi seçilir.
    final_query = (db.session.query(
        unified_query.c.id,
        unified_query.c.event_date,
        unified_query.c.category,
        unified_query.c.description,
        unified_query.c.amount,
        unified_query.c.currency
    ).order_by(desc(unified_query.c.event_date)).limit(5))
    
    # 4. Sonuçlar alınır ve frontend'e hazır hale getirilir.
    final_items_raw = final_query.all()
    final_items_dict = [item._asdict() for item in final_items_raw]

    return {"items": final_items_dict}