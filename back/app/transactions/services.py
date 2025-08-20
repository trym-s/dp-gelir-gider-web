
# app/transactions/services.py
from sqlalchemy import func, case, union_all, literal_column, asc, desc
from app import db
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

