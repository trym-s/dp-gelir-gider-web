# /back/app/loans/services.py
from app import db
from .models import Loan, LoanType, LoanPayment, LoanStatus, LoanPaymentType, LoanPaymentStatus
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import func
import calendar

# --- GENERIC HELPER FUNCTIONS ---

def _calculate_fixed_monthly_payment(principal: Decimal, monthly_net_rate: Decimal, term_months: int, bsmv_rate: Decimal) -> Decimal:
    """
    Calculates the fixed monthly payment amount (annuity) for a loan.
    The rates provided to this function MUST be in decimal form (e.g., 0.04 for 4%).
    """
    # Effective rate includes BSMV
    effective_rate = monthly_net_rate * (Decimal('1') + bsmv_rate)
    
    if effective_rate == 0:
        if term_months == 0: return principal
        return (principal / Decimal(term_months)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    if term_months <= 0:
        return principal

    power_term = (Decimal('1') + effective_rate) ** term_months
    
    monthly_payment = principal * (effective_rate * power_term) / (power_term - Decimal('1'))
    
    return monthly_payment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def _get_safe_next_due_date(base_date: date, due_day: int) -> date:
    next_month_date = base_date + relativedelta(months=1)
    _, days_in_month = calendar.monthrange(next_month_date.year, next_month_date.month)
    safe_due_day = min(due_day, days_in_month)
    return next_month_date.replace(day=safe_due_day)

def _update_loan_balance_from_payments(loan: Loan):
    total_principal_paid = db.session.query(
        func.sum(LoanPayment.principal_amount)
    ).filter(
        LoanPayment.loan_id == loan.id,
        LoanPayment.status != LoanPaymentStatus.REVERSED
    ).scalar() or Decimal('0.00')

    loan.remaining_principal = loan.amount_drawn - total_principal_paid

    if loan.remaining_principal < Decimal('0.01'):
        loan.remaining_principal = Decimal('0.00')
        loan.status = LoanStatus.PAID_IN_FULL
        loan.next_payment_due_date = None
    else:
        if loan.status == LoanStatus.PAID_IN_FULL:
            last_payment_date = db.session.query(func.max(LoanPayment.payment_date)).filter(
                LoanPayment.loan_id == loan.id,
                LoanPayment.status != LoanPaymentStatus.REVERSED
            ).scalar() or loan.date_drawn
            loan.next_payment_due_date = _get_safe_next_due_date(last_payment_date, loan.payment_due_day)

        if loan.next_payment_due_date and loan.next_payment_due_date < date.today():
            loan.status = LoanStatus.OVERDUE
        else:
            loan.status = LoanStatus.ACTIVE

# --- LOAN SERVICES ---

def get_all_loans():
    return Loan.query.order_by(Loan.date_drawn.desc()).all()

def get_loan_by_id(loan_id):
    return Loan.query.get(loan_id)

def create_loan(data):
    # CRITICAL FIX: Convert percentage values from frontend to decimals
    amount_drawn = Decimal(data['amount_drawn'])
    term_months = int(data['term_months'])
    monthly_net_rate_decimal = Decimal(str(data['monthly_interest_rate'])) / Decimal('100')
    bsmv_rate_decimal = Decimal(str(data.get('bsmv_rate', 15))) / Decimal('100')
    
    monthly_payment = _calculate_fixed_monthly_payment(
        principal=amount_drawn,
        monthly_net_rate=monthly_net_rate_decimal,
        bsmv_rate=bsmv_rate_decimal,
        term_months=term_months
    )

    date_drawn = datetime.strptime(data['date_drawn'], '%Y-%m-%d').date()
    payment_due_day = int(data['payment_due_day'])
    next_payment_date = _get_safe_next_due_date(date_drawn, payment_due_day)
    
    new_loan = Loan(
        name=data['name'],
        bank_account_id=data['bank_account_id'],
        loan_type_id=data['loan_type_id'],
        amount_drawn=amount_drawn,
        term_months=term_months,
        monthly_interest_rate=float(monthly_net_rate_decimal), # Store as decimal float
        bsmv_rate=float(bsmv_rate_decimal), # Store as decimal float
        payment_due_day=payment_due_day,
        monthly_payment_amount=monthly_payment,
        date_drawn=date_drawn,
        next_payment_due_date=next_payment_date,
        description=data.get('description'),
        remaining_principal=amount_drawn,
        status=LoanStatus.ACTIVE
    )
    
    db.session.add(new_loan)
    db.session.commit()
    return new_loan

def update_loan(loan_id, data):
    loan = get_loan_by_id(loan_id)
    if loan:
        financial_fields_changed = any(k in data for k in ['amount_drawn', 'term_months', 'monthly_interest_rate', 'bsmv_rate'])
        
        for key, value in data.items():
            # CRITICAL FIX: Convert percentage values from frontend to decimals before setting
            if key == 'monthly_interest_rate' or key == 'bsmv_rate':
                value = float(value) / 100.0
            
            if key in ['date_drawn', 'next_payment_due_date'] and isinstance(value, str):
                try:
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    continue
            setattr(loan, key, value)
            
        if financial_fields_changed:
            loan.monthly_payment_amount = _calculate_fixed_monthly_payment(
                principal=loan.amount_drawn,
                monthly_net_rate=Decimal(str(loan.monthly_interest_rate)),
                bsmv_rate=Decimal(str(loan.bsmv_rate)),
                term_months=loan.term_months
            )
            
        db.session.commit()
    return loan

def delete_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if loan:
        db.session.delete(loan)
        db.session.commit()
    return loan

# --- LOAN TYPE SERVICES ---
def get_all_loan_types():
    return LoanType.query.all()

def get_loan_type_by_id(loan_type_id):
    return LoanType.query.get(loan_type_id)

def create_loan_type(data):
    new_loan_type = LoanType(name=data['name'])
    db.session.add(new_loan_type)
    db.session.commit()
    return new_loan_type

def update_loan_type(loan_type_id, data):
    loan_type = get_loan_type_by_id(loan_type_id)
    if loan_type:
        loan_type.name = data.get('name', loan_type.name)
        db.session.commit()
    return loan_type

def delete_loan_type(loan_type_id):
    loan_type = get_loan_type_by_id(loan_type_id)
    if loan_type:
        db.session.delete(loan_type)
        db.session.commit()
    return loan_type

# --- LOAN PAYMENT SERVICES ---

def get_payment_by_id(payment_id: int) -> LoanPayment:
    return LoanPayment.query.get(payment_id)

def get_payments_for_loan(loan_id: int, page: int = 1, per_page: int = 20):
    return LoanPayment.query.filter(LoanPayment.loan_id == loan_id)\
        .order_by(LoanPayment.payment_date.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

def make_payment(loan_id: int, amount_paid: Decimal, payment_date: date,
                 payment_type: LoanPaymentType, notes: str = None) -> Loan:
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError(f"Loan with ID {loan_id} not found.")
    if loan.status == LoanStatus.PAID_IN_FULL:
        raise ValueError("This loan has already been paid in full.")

    net_interest_rate = Decimal(str(loan.monthly_interest_rate))
    bsmv_rate = Decimal(str(loan.bsmv_rate))
    effective_rate = net_interest_rate * (Decimal('1') + bsmv_rate)
    
    interest_due = (loan.remaining_principal * effective_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    interest_paid = min(amount_paid, interest_due)
    principal_paid = amount_paid - interest_paid

    if principal_paid > loan.remaining_principal:
        principal_paid = loan.remaining_principal
        amount_paid = interest_paid + principal_paid

    new_payment = LoanPayment(
        loan_id=loan.id,
        amount_paid=amount_paid,
        principal_amount=principal_paid,
        interest_amount=interest_paid,
        payment_date=payment_date,
        payment_type=payment_type,
        notes=notes,
        status=LoanPaymentStatus.COMPLETED
    )
    db.session.add(new_payment)

    if loan.status != LoanStatus.PAID_IN_FULL and payment_type != LoanPaymentType.SETTLEMENT:
        base_date = loan.next_payment_due_date or payment_date
        loan.next_payment_due_date = _get_safe_next_due_date(base_date, loan.payment_due_day)

    db.session.flush()
    _update_loan_balance_from_payments(loan)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e

    return loan

def reverse_payment(payment_id: int) -> Loan:
    payment = get_payment_by_id(payment_id)
    if not payment:
        raise ValueError("Payment not found.")
    if payment.status == LoanPaymentStatus.REVERSED:
        raise ValueError("This payment has already been reversed.")

    loan = payment.loan
    payment.status = LoanPaymentStatus.REVERSED
    
    db.session.flush()
    _update_loan_balance_from_payments(loan)
    
    db.session.commit()
    
    return loan

# --- AMORTIZATION SCHEDULE ---

def generate_amortization_schedule(loan_id: int) -> list[dict]:
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError("Kredi bulunamadı.")

    principal = loan.amount_drawn
    monthly_net_rate = Decimal(str(loan.monthly_interest_rate))
    term_months = loan.term_months
    bsmv_rate = Decimal(str(loan.bsmv_rate))

    monthly_payment = loan.monthly_payment_amount
    if not monthly_payment:
        monthly_payment = _calculate_fixed_monthly_payment(principal, monthly_net_rate, term_months, bsmv_rate)

    schedule = []
    remaining_principal = principal
    
    effective_rate_for_interest = monthly_net_rate * (Decimal('1') + bsmv_rate)

    for i in range(1, term_months + 1):
        interest_share = (remaining_principal * effective_rate_for_interest).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        principal_share = (monthly_payment - interest_share)

        if i == term_months:
            principal_share = remaining_principal
            monthly_payment = principal_share + interest_share

        remaining_principal -= principal_share

        schedule.append({
            "installment_number": i,
            "monthly_payment": float(monthly_payment),
            "principal_share": float(principal_share),
            "interest_share": float(interest_share),
            "remaining_principal": float(remaining_principal)
        })

    return schedule