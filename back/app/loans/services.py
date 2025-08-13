# /back/app/loans/services.py
from app import db
from .models import Loan, LoanType, LoanPayment, LoanStatus, LoanPaymentType, LoanPaymentStatus, AmortizationSchedule
from app.banks.models import BankAccount
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import func
from sqlalchemy.orm import joinedload
import calendar

# --- GENERIC HELPER FUNCTIONS ---

def _calculate_fixed_monthly_payment(principal: Decimal, monthly_net_rate: Decimal, term_months: int, bsmv_rate: Decimal) -> Decimal:
    effective_rate = monthly_net_rate * (Decimal('1') + bsmv_rate)
    if effective_rate == 0:
        return (principal / Decimal(term_months)) if term_months > 0 else principal
    if term_months <= 0:
        return principal
    power_term = (Decimal('1') + effective_rate) ** term_months
    monthly_payment = principal * (effective_rate * power_term) / (power_term - Decimal('1'))
    return monthly_payment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def _get_safe_due_date(base_date: date, due_day: int, month_offset: int) -> date:
    target_date = base_date + relativedelta(months=month_offset)
    _, days_in_month = calendar.monthrange(target_date.year, target_date.month)
    safe_due_day = min(due_day, days_in_month)
    return target_date.replace(day=safe_due_day)

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
        loan.status = LoanStatus.ACTIVE
        # Find the first unpaid installment to set the next due date
        first_unpaid = AmortizationSchedule.query.filter(
            AmortizationSchedule.loan_id == loan.id,
            AmortizationSchedule.payment == None
        ).order_by(AmortizationSchedule.due_date.asc()).first()
        
        if first_unpaid:
            loan.next_payment_due_date = first_unpaid.due_date
            if first_unpaid.due_date < date.today():
                loan.status = LoanStatus.OVERDUE
        else: # Should not happen if remaining_principal > 0, but as a fallback
            loan.status = LoanStatus.PAID_IN_FULL
            loan.next_payment_due_date = None


def _generate_and_save_amortization_schedule(loan: Loan):
    """
    Calculates the amortization schedule and saves it to the database.
    This is called once when a loan is created.
    """
    principal = loan.amount_drawn
    monthly_net_rate = Decimal(str(loan.monthly_interest_rate))
    term_months = loan.term_months
    bsmv_rate = Decimal(str(loan.bsmv_rate))
    monthly_payment = loan.monthly_payment_amount
    
    effective_rate_for_interest = monthly_net_rate * (Decimal('1') + bsmv_rate)
    remaining_principal = principal
    
    schedule_entries = []
    for i in range(1, term_months + 1):
        due_date = _get_safe_due_date(loan.date_drawn, loan.payment_due_day, i)
        interest_share = (remaining_principal * effective_rate_for_interest).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        principal_share = monthly_payment - interest_share

        if i == term_months: # Final payment adjustment
            principal_share = remaining_principal
            monthly_payment = principal_share + interest_share

        remaining_principal -= principal_share

        schedule_entry = AmortizationSchedule(
            loan_id=loan.id,
            installment_number=i,
            due_date=due_date,
            monthly_payment=monthly_payment,
            principal_share=principal_share,
            interest_share=interest_share,
            remaining_principal=remaining_principal if remaining_principal > 0 else Decimal('0.00')
        )
        schedule_entries.append(schedule_entry)
        
    db.session.bulk_save_objects(schedule_entries)


# --- LOAN SERVICES ---

def get_all_loans():
    return Loan.query.order_by(Loan.date_drawn.desc()).all()

def get_loan_by_id(loan_id):
    return Loan.query.get(loan_id)

def create_loan(data):
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
    # The actual next payment date will be set from the generated schedule
    
    new_loan = Loan(
        name=data['name'],
        bank_account_id=data['bank_account_id'],
        loan_type_id=data['loan_type_id'],
        amount_drawn=amount_drawn,
        term_months=term_months,
        monthly_interest_rate=float(monthly_net_rate_decimal),
        bsmv_rate=float(bsmv_rate_decimal),
        payment_due_day=payment_due_day,
        monthly_payment_amount=monthly_payment,
        date_drawn=date_drawn,
        description=data.get('description'),
        remaining_principal=amount_drawn,
        status=LoanStatus.ACTIVE
    )
    
    db.session.add(new_loan)
    db.session.flush() # Flush to get the new_loan.id

    _generate_and_save_amortization_schedule(new_loan)
    _update_loan_balance_from_payments(new_loan) # Sets initial next_payment_due_date

    db.session.commit()
    return new_loan

# /back/app/loans/services.py dosyasında güncellenecek fonksiyon

def update_loan(loan_id, data):
    """
    Bir krediyi ödeme durumuna göre koşullu olarak günceller. (MS SQL Server Uyumlu Versiyon)
    """
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError("Kredi bulunamadı")

    # --- ÇÖZÜMÜN UYGULANDIĞI YER ---
    # ÖNCEKİ SORUNLU KOD:
    # has_payments = db.session.query(LoanPayment.query.filter_by(loan_id=loan_id).exists()).scalar()
    
    # YENİ UYUMLU KOD:
    payment_exists = LoanPayment.query.filter_by(loan_id=loan_id).first()
    has_payments = payment_exists is not None
    # --- DÜZELTME SONU ---

    if has_payments:
        # --- SENARYO 2: ÖDEME YAPILMIŞSA ---
        # (Bu kısım aynı kalıyor)
        loan.name = data.get('name', loan.name)
        loan.description = data.get('description', loan.description)
        loan.payment_due_day = data.get('payment_due_day', loan.payment_due_day)
        loan.bank_account_id = data.get('bank_account_id', loan.bank_account_id)
        loan.loan_type_id = data.get('loan_type_id', loan.loan_type_id)
    else:
        # --- SENARYO 1: HİÇ ÖDEME YAPILMAMIŞSA ---
        # (Bu kısım da aynı kalıyor, sadece yukarıdaki kontrol değişti)
        loan.name = data.get('name', loan.name)
        loan.description = data.get('description', loan.description)
        loan.payment_due_day = int(data.get('payment_due_day', loan.payment_due_day))
        loan.bank_account_id = data.get('bank_account_id', loan.bank_account_id)
        loan.loan_type_id = data.get('loan_type_id', loan.loan_type_id)
        
        loan.amount_drawn = Decimal(str(data.get('amount_drawn', loan.amount_drawn)))
        loan.term_months = int(data.get('term_months', loan.term_months))
        loan.monthly_interest_rate = float(Decimal(str(data.get('monthly_interest_rate', loan.monthly_interest_rate))))
        
        date_drawn_str = data.get('date_drawn')
        if date_drawn_str:
            loan.date_drawn = datetime.strptime(date_drawn_str, '%Y-%m-%d').date()

        loan.remaining_principal = loan.amount_drawn
        
        bsmv_rate_from_db = loan.bsmv_rate if loan.bsmv_rate is not None else 0.15
        bsmv_rate_decimal = Decimal(str(bsmv_rate_from_db))

        loan.monthly_payment_amount = _calculate_fixed_monthly_payment(
            principal=loan.amount_drawn,
            monthly_net_rate=Decimal(str(loan.monthly_interest_rate)),
            bsmv_rate=bsmv_rate_decimal,
            term_months=loan.term_months
        )
        
        AmortizationSchedule.query.filter_by(loan_id=loan.id).delete()
        db.session.flush()
        _generate_and_save_amortization_schedule(loan)
        _update_loan_balance_from_payments(loan)

    db.session.commit()
    return loan

def delete_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if loan:
        db.session.delete(loan)
        db.session.commit()
    return loan

def get_loans_by_bank_id(bank_id, bank_account_id=None):
    query = Loan.query.join(BankAccount).filter(BankAccount.bank_id == bank_id)
    if bank_account_id:
        query = query.filter(BankAccount.id == bank_account_id)
    return query.all()

# --- LOAN TYPE SERVICES ---
def get_all_loan_types():
    return LoanType.query.all()

# ... (other loan type services remain the same)
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

def get_payments_for_loan(loan_id: int, page: int = 1, per_page: int = 20):
    return LoanPayment.query.filter(LoanPayment.loan_id == loan_id)\
        .order_by(LoanPayment.payment_date.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

def make_payment(loan_id: int, amount_paid: Decimal, payment_date: date,
                 payment_type: LoanPaymentType, notes: str = None, 
                 installment_id: int = None) -> Loan:
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError(f"Loan with ID {loan_id} not found.")
    if loan.status == LoanStatus.PAID_IN_FULL:
        raise ValueError("This loan has already been paid in full.")

    # For now, we simplify the logic. A regular payment must be tied to an installment.
    if payment_type == LoanPaymentType.REGULAR_INSTALLMENT and not installment_id:
        raise ValueError("A regular installment payment must be linked to a specific installment.")

    amortization_schedule_entry = None
    if installment_id:
        amortization_schedule_entry = AmortizationSchedule.query.get(installment_id)
        if not amortization_schedule_entry or amortization_schedule_entry.loan_id != loan_id:
            raise ValueError("Installment ID is invalid for this loan.")
        if amortization_schedule_entry.payment:
            raise ValueError("This installment has already been paid.")

    # Simplified financial calculation: assume amount_paid covers the installment
    # A more complex logic would handle partial payments or overpayments
    principal_paid = amortization_schedule_entry.principal_share if amortization_schedule_entry else Decimal('0.00')
    interest_paid = amortization_schedule_entry.interest_share if amortization_schedule_entry else Decimal('0.00')
    
    # For non-installment payments (like prepayments), principal is the full amount
    if payment_type == LoanPaymentType.PREPAYMENT:
        principal_paid = amount_paid
        interest_paid = Decimal('0.00')

    new_payment = LoanPayment(
        loan_id=loan.id,
        amortization_schedule_id=installment_id,
        amount_paid=amount_paid,
        principal_amount=principal_paid,
        interest_amount=interest_paid,
        payment_date=payment_date,
        payment_type=payment_type,
        notes=notes,
        status=LoanPaymentStatus.COMPLETED
    )
    db.session.add(new_payment)
    db.session.flush()
    
    _update_loan_balance_from_payments(loan)
    
    db.session.commit()
    return loan

# --- AMORTIZATION SCHEDULE SERVICE ---

def get_amortization_schedule_for_loan(loan_id: int) -> list[AmortizationSchedule]:
    """
    Retrieves the amortization schedule from the database for a given loan.
    If the schedule does not exist (for older loans or failed creations), 
    it generates and saves it before returning, making the system self-healing.
    """
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError("Kredi bulunamadı.")
    
    # Eagerly load the 'payment' relationship to avoid N+1 queries in the schema
    schedule = AmortizationSchedule.query.filter_by(loan_id=loan_id)\
        .options(joinedload(AmortizationSchedule.payment))\
        .order_by(AmortizationSchedule.installment_number.asc())\
        .all()
        
    # If the schedule is empty, it's an old loan or a creation failed. Generate and save it.
    if not schedule:
        _generate_and_save_amortization_schedule(loan)
        db.session.commit()
        # Now, refetch the newly created schedule with the same eager loading
        schedule = AmortizationSchedule.query.filter_by(loan_id=loan_id)\
            .options(joinedload(AmortizationSchedule.payment))\
            .order_by(AmortizationSchedule.installment_number.asc())\
            .all()
            
    return schedule
def get_all_bank_accounts():
    return BankAccount.query.all()


def get_all_bank_accounts():
    return BankAccount.query.all()

def get_loan_history(start_date_str=None, end_date_str=None):
    """
    Generates a historical timeline of loan balances based on actual payment dates.
    """
    loans = Loan.query.all()
    
    individual_histories_raw = {}
    all_dates = set()

    # Step 1: Generate individual history for each loan based on real events
    for loan in loans:
        # Get payments sorted by date, which is critical
        payments = sorted(
            [p for p in loan.payments if p.status != LoanPaymentStatus.REVERSED],
            key=lambda p: p.payment_date
        )
        
        history = []
        current_balance = loan.amount_drawn

        # Add the starting point of the loan
        start_date = loan.date_drawn
        history.append({"date": start_date, "balance": current_balance})
        all_dates.add(start_date)

        # Add a point for each payment
        for payment in payments:
            current_balance -= payment.principal_amount
            payment_date = payment.payment_date
            history.append({
                "date": payment_date,
                "balance": current_balance if current_balance > Decimal('0.0') else Decimal('0.0')
            })
            all_dates.add(payment_date)
        
        individual_histories_raw[loan.id] = history

    # Step 2: Create a unified, sorted timeline from all unique dates
    sorted_unique_dates = sorted(list(all_dates))

    # Step 3: Build the final response, ensuring all series align to the unified timeline
    final_individual_histories = {}
    total_balance_map = {d: Decimal('0.0') for d in sorted_unique_dates}

    for loan_id, history_points in individual_histories_raw.items():
        loan = next((l for l in loans if l.id == loan_id), None)
        if not loan: continue

        final_loan_history = []
        balance_map = {p['date']: p['balance'] for p in history_points}
        last_known_balance = Decimal('0.0')

        for report_date in sorted_unique_dates:
            # If the loan started after this date, balance is 0
            if loan.date_drawn > report_date:
                final_loan_history.append({"date": report_date.strftime('%Y-%m-%d'), "balance": 0.0})
                continue

            # If there's an event on this date, update the balance
            if report_date in balance_map:
                last_known_balance = balance_map[report_date]
            
            # Append the (potentially carried-over) balance for this date
            final_loan_history.append({
                "date": report_date.strftime('%Y-%m-%d'),
                "balance": float(last_known_balance)
            })
            # Add this loan's balance to the daily total
            total_balance_map[report_date] += last_known_balance

        final_individual_histories[f"loan_id_{loan_id}"] = {
            "name": loan.name,
            "history": final_loan_history
        }

    # Step 4: Finalize the total balance history list
    total_balance_history = [
        {"date": dt.strftime('%Y-%m-%d'), "balance": float(bal)}
        for dt, bal in total_balance_map.items()
    ]

    return {
        "total_balance_history": total_balance_history,
        "individual_loan_histories": final_individual_histories
    }
    
