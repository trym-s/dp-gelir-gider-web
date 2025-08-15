# app/transactions/services.py
from sqlalchemy import func, case, union_all, literal_column, asc, desc
from app import db
# Gerekli tüm modelleri import ediyoruz
from app.expense.models import Payment, Expense, Supplier 
from app.income.models import IncomeReceipt, Income
from app.customer.models import Customer
from app.region.models import Region
from app.budget_item.models import BudgetItem
from app.credit_cards.models import CreditCard, CreditCardTransaction, DailyCreditCardLimit
from app.loans.models import Loan, LoanPayment
from app.banks.models import DailyBalance, DailyRisk, BankAccount, Bank, KmhLimit

def get_unified_transactions(filters):
    """
    Tüm para hareketlerini (Ödemeler, Tahsilatlar, Kredi Kartı İşlemleri, Kredi Ödemeleri)
    birleştirerek tek bir liste oluşturan nihai servis fonksiyonu.
    """
    
    # --- Sorgu 1: Genel Gider Ödemeleri (Payments) ---
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

    # --- Sorgu 2: Gelir Tahsilatları (Receipts) ---
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

    # --- YENİ Sorgu 3: Kredi Kartı İşlemleri (Harcama ve Ödemeler) ---
    cc_transactions_query = db.session.query(
        (literal_column("'cct-'") + func.cast(CreditCardTransaction.id, db.String)).label('id'),
        CreditCardTransaction.transaction_date.label('date'),
        CreditCardTransaction.amount.label('amount'),
        case(
            (CreditCardTransaction.type == 'PAYMENT', 'Kredi Kartı Ödemesi'),
            else_='Kredi Kartı Harcaması'
        ).label('category'),
        func.coalesce(CreditCardTransaction.description, '').label('invoice_number'), # Açıklamayı fatura no gibi kullanabiliriz
        literal_column("'Bilinmiyor'").label('region'), # Kredi kartlarının bölgesi yok
        func.coalesce(CreditCard.name, 'Bilinmeyen Kart').label('counterparty')
    ).outerjoin(CreditCard, CreditCardTransaction.credit_card_id == CreditCard.id)

    # --- YENİ Sorgu 4: Kredi Taksit Ödemeleri (Loan Payments) ---
    loan_payments_query = db.session.query(
        (literal_column("'loanpayment-'") + func.cast(LoanPayment.id, db.String)).label('id'),
        LoanPayment.payment_date.label('date'),
        LoanPayment.amount_paid.label('amount'),
        literal_column("'Kredi Ödemesi'").label('category'),
        func.coalesce(LoanPayment.notes, '').label('invoice_number'), # Notları fatura no gibi kullanabiliriz
        literal_column("'Bilinmiyor'").label('region'), # Kredilerin bölgesi yok
        func.coalesce(Loan.name, 'Bilinmeyen Kredi').label('counterparty')
    ).outerjoin(Loan, LoanPayment.loan_id == Loan.id)

    # --- Tüm Sorguları UNION ALL ile Birleştirme ---
    unified_query_stmt = union_all(
        payments_query, 
        receipts_query, 
        cc_transactions_query, 
        loan_payments_query
    ).alias('transactions')
    
    query = db.session.query(unified_query_stmt)

    # --- Filtreleme (Tüm birleşik sorgu için ortak) ---
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
    sort_by = filters.get('sort_by', 'date') # Varsayılan sıralama: tarih
    sort_order = filters.get('sort_order', 'desc') # Varsayılan yön: azalan
    
    sortable_columns = {
        'date': unified_query_stmt.c.date,
        'category': unified_query_stmt.c.category,
        'counterparty': unified_query_stmt.c.counterparty,
        'amount': unified_query_stmt.c.amount
    }
    
    if sort_by in sortable_columns:
        column_to_sort = sortable_columns[sort_by]
        if sort_order == 'asc':
            query = query.order_by(asc(column_to_sort))
        else:
            query = query.order_by(desc(column_to_sort))
            
    # --- Sayfalama ---
    page = int(filters.get('page', 1))
    per_page = int(filters.get('per_page', 20))
    paginated_result = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return paginated_result

def get_unified_daily_entries(filters):
    """
    DÜZELTME: join'ler outerjoin'e çevrilerek eksik ilişkili verilerin de
    sorguya dahil edilmesi ve filtrelenebilmesi sağlandı.
    """
    
    # --- Banka Bakiye Sorguları ---
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

    # --- KMH Risk Sorguları ---
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
     
    # --- Kredi Kartı Limit Sorguları ---
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

    # --- Birleştirme, Filtreleme ve Sayfalama (Bu kısım aynı kalıyor) ---
    unified_query_stmt = union_all(
        balance_morning_query, balance_evening_query,
        risk_morning_query, risk_evening_query,
        cc_limit_morning_query, cc_limit_evening_query
    ).alias('daily_entries')
    
    query = db.session.query(unified_query_stmt)

    if filters.get('startDate'): query = query.filter(unified_query_stmt.c.entry_date >= filters['startDate'])
    if filters.get('endDate'): query = query.filter(unified_query_stmt.c.entry_date <= filters['endDate'])
    if filters.get('categories'):
        category_list = filters['categories'].split(',')
        query = query.filter(unified_query_stmt.c.category.in_(category_list))
    if filters.get('q'):
        search_term = f"%{filters['q'].lower()}%"
        query = query.filter(db.or_(func.lower(func.coalesce(unified_query_stmt.c.bank_name, '')).like(search_term), func.lower(func.coalesce(unified_query_stmt.c.account_name, '')).like(search_term)))

    sort_by = filters.get('sort_by', 'entry_date') # Varsayılan sıralama: tarih
    sort_order = filters.get('sort_order', 'desc')   # Varsayılan yön: azalan

    sortable_columns = {
        'date': unified_query_stmt.c.entry_date, # Frontend'den 'date' gelecek, backend'de 'entry_date'e eşlenecek
        'period': unified_query_stmt.c.period,
        'category': unified_query_stmt.c.category,
        'bank_name': unified_query_stmt.c.bank_name,
        'account_name': unified_query_stmt.c.account_name,
        'amount': unified_query_stmt.c.amount
    }

    if sort_by in sortable_columns:
        column_to_sort = sortable_columns[sort_by]
        if sort_order == 'asc':
            query = query.order_by(asc(column_to_sort))
        else:
            query = query.order_by(desc(column_to_sort))
    else: # Eğer sıralama yoksa, varsayılan olarak tarihe ve vakte göre sırala
         query = query.order_by(desc(unified_query_stmt.c.entry_date), desc(unified_query_stmt.c.period))

    # --- Sayfalama ---
    page = int(filters.get('page', 1))
    per_page = int(filters.get('per_page', 20))
    return query.paginate(page=page, per_page=per_page, error_out=False)