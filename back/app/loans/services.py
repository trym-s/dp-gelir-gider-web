
# app/loans/services.py

from app import db
from app.errors import AppError
from .models import (
    Loan, LoanType, LoanPayment, LoanStatus, LoanPaymentType,
    LoanPaymentStatus, AmortizationSchedule
)
from app.banks.models import BankAccount
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import func
from sqlalchemy.orm import joinedload
import calendar
import logging

from app.logging_utils import dinfo, dwarn, derr

log = logging.getLogger(__name__)

# --- GENERIC HELPER FUNCTIONS ---

def _calculate_fixed_monthly_payment(principal: Decimal,
                                     monthly_net_rate: Decimal,
                                     term_months: int,
                                     bsmv_rate: Decimal) -> Decimal:
    """Eşit taksit (annuity) hesaplaması. BSMV dahil efektif oran."""
    effective_rate = monthly_net_rate * (Decimal('1') + bsmv_rate)
    if term_months <= 0:
        return principal
    if effective_rate == 0:
        return (principal / Decimal(term_months)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    power_term = (Decimal('1') + effective_rate) ** term_months
    monthly_payment = principal * (effective_rate * power_term) / (power_term - Decimal('1'))
    return monthly_payment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _get_safe_due_date(base_date: date, due_day: int, month_offset: int) -> date:
    """Ay sonlarını taşırmadan güvenli vade tarihi üretir."""
    target_date = base_date + relativedelta(months=month_offset)
    _, days_in_month = calendar.monthrange(target_date.year, target_date.month)
    safe_due_day = min(int(due_day), days_in_month)
    return target_date.replace(day=safe_due_day)


def _update_loan_balance_from_payments(loan: Loan):
    """Ödenen ana paraya göre bakiye ve durum güncellemesi."""
    total_principal_paid = db.session.query(
        func.sum(LoanPayment.principal_amount)
    ).filter(
        LoanPayment.loan_id == loan.id,
        LoanPayment.status != LoanPaymentStatus.REVERSED
    ).scalar() or Decimal('0.00')

    loan.remaining_principal = (loan.amount_drawn - total_principal_paid).quantize(Decimal('0.00'))
    dinfo("loan.recalc.balance", loan_id=loan.id, remaining=str(loan.remaining_principal))

    if loan.remaining_principal <= Decimal('0.00'):
        loan.remaining_principal = Decimal('0.00')
        loan.status = LoanStatus.PAID_IN_FULL
        loan.next_payment_due_date = None
        dinfo("loan.recalc.paid_in_full", loan_id=loan.id)
        return

    # İlk ödenmemiş taksiti bul, vade geçmişse OVERDUE
    first_unpaid = (
        AmortizationSchedule.query
        .filter(AmortizationSchedule.loan_id == loan.id,
                AmortizationSchedule.payment == None)  # noqa: E711
        .order_by(AmortizationSchedule.due_date.asc())
        .first()
    )
    loan.status = LoanStatus.ACTIVE
    if first_unpaid:
        loan.next_payment_due_date = first_unpaid.due_date
        if first_unpaid.due_date < date.today():
            loan.status = LoanStatus.OVERDUE
            dwarn("loan.recalc.overdue", loan_id=loan.id, due_date=first_unpaid.due_date.isoformat())
    else:
        # Beklenmez ama güvenlik için:
        loan.status = LoanStatus.PAID_IN_FULL
        loan.next_payment_due_date = None
        dwarn("loan.recalc.missing_unpaid_installment", loan_id=loan.id)


def _generate_and_save_amortization_schedule(loan: Loan):
    """
    Kredinin amortisman planını oluşturup kaydeder.
    Sadece kredi oluşturulurken veya plan yeniden üretilecekse çağrılır.
    """
    principal = loan.amount_drawn
    monthly_net_rate = Decimal(str(loan.monthly_interest_rate))
    term_months = int(loan.term_months)
    bsmv_rate = Decimal(str(loan.bsmv_rate))
    monthly_payment = loan.monthly_payment_amount

    effective_rate_for_interest = monthly_net_rate * (Decimal('1') + bsmv_rate)
    remaining_principal = principal
    schedule_entries = []

    for i in range(1, term_months + 1):
        due_date = _get_safe_due_date(loan.date_drawn, loan.payment_due_day, i)
        interest_share = (remaining_principal * effective_rate_for_interest).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        principal_share = (monthly_payment - interest_share).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        if i == term_months:
            principal_share = remaining_principal
            monthly_payment = principal_share + interest_share

        remaining_principal = (remaining_principal - principal_share).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if remaining_principal < Decimal('0.00'):
            remaining_principal = Decimal('0.00')

        schedule_entries.append(AmortizationSchedule(
            loan_id=loan.id,
            installment_number=i,
            due_date=due_date,
            monthly_payment=monthly_payment,
            principal_share=principal_share,
            interest_share=interest_share,
            remaining_principal=remaining_principal
        ))

    db.session.bulk_save_objects(schedule_entries)
    dinfo("loan.schedule.generated", loan_id=loan.id, items=len(schedule_entries))


# --- LOAN SERVICES ---

def get_all_loans():
    rows = Loan.query.order_by(Loan.date_drawn.desc()).all()
    dinfo("loan.list", count=len(rows))
    return rows


def get_loan_by_id(loan_id):
    row = Loan.query.get(loan_id)
    if not row:
        dwarn("loan.get.not_found", loan_id=loan_id)
    return row


def create_loan(data):
    try:
        amount_drawn = Decimal(str(data['amount_drawn']))
        term_months = int(data['term_months'])
        monthly_net_rate_decimal = Decimal(str(data['monthly_interest_rate'])) / Decimal('100')
        bsmv_rate_decimal = Decimal(str(data.get('bsmv_rate', 15))) / Decimal('100')
        date_drawn = datetime.strptime(data['date_drawn'], '%Y-%m-%d').date()
        payment_due_day = int(data['payment_due_day'])
    except (KeyError, ValueError) as e:
        dwarn("loan.create.bad_input", reason=str(e))
        raise AppError("Eksik veya geçersiz alanlar.", 400)

    monthly_payment = _calculate_fixed_monthly_payment(
        principal=amount_drawn,
        monthly_net_rate=monthly_net_rate_decimal,
        bsmv_rate=bsmv_rate_decimal,
        term_months=term_months
    )

    new_loan = Loan(
        name=data['name'],
        bank_account_id=data['bank_account_id'],
        loan_type_id=data['loan_type_id'],
        amount_drawn=amount_drawn,
        term_months=term_months,
        monthly_interest_rate=float(monthly_net_rate_decimal),  # net (yüzde değil)
        bsmv_rate=float(bsmv_rate_decimal),
        payment_due_day=payment_due_day,
        monthly_payment_amount=monthly_payment,
        date_drawn=date_drawn,
        description=data.get('description'),
        remaining_principal=amount_drawn,
        status=LoanStatus.ACTIVE
    )

    db.session.add(new_loan)
    db.session.flush()  # id için

    _generate_and_save_amortization_schedule(new_loan)
    _update_loan_balance_from_payments(new_loan)  # next_payment_due_date set edilir

    db.session.commit()
    dinfo("loan.create.committed", loan_id=new_loan.id, amount=str(amount_drawn), term=term_months)
    return new_loan


def update_loan(loan_id, data):
    """
    Ödeme var/yok durumuna göre krediyi günceller.
    (Ödeme yoksa finansal parametreler güncellenebilir, varsa sınırlı alanlar.)
    """
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError("Kredi bulunamadı")

    # Ödeme var mı?
    has_payments = LoanPayment.query.filter_by(loan_id=loan_id).first() is not None
    dinfo("loan.update.begin", loan_id=loan_id, has_payments=has_payments)

    # Ortak alanlar
    loan.name = data.get('name', loan.name)
    loan.description = data.get('description', loan.description)
    if 'payment_due_day' in data:
        try:
            loan.payment_due_day = int(data.get('payment_due_day', loan.payment_due_day))
        except Exception:
            dwarn("loan.update.bad_due_day", loan_id=loan_id, value=data.get('payment_due_day'))
            raise AppError("payment_due_day sayısal olmalıdır.", 400)
    loan.bank_account_id = data.get('bank_account_id', loan.bank_account_id)
    loan.loan_type_id = data.get('loan_type_id', loan.loan_type_id)

    if not has_payments:
        # Finansal alanlar sadece ödeme yoksa değiştirilsin
        if 'amount_drawn' in data:
            loan.amount_drawn = Decimal(str(data.get('amount_drawn')))
        if 'term_months' in data:
            loan.term_months = int(data.get('term_months', loan.term_months))
        if 'monthly_interest_rate' in data:
            loan.monthly_interest_rate = float(Decimal(str(data.get('monthly_interest_rate'))))
        if 'date_drawn' in data and data.get('date_drawn'):
            loan.date_drawn = datetime.strptime(data['date_drawn'], '%Y-%m-%d').date()

        loan.remaining_principal = loan.amount_drawn

        # bsmv kaynaktan ya da varsayılan
        bsmv_rate_from_db = loan.bsmv_rate if loan.bsmv_rate is not None else 0.15
        bsmv_rate_decimal = Decimal(str(bsmv_rate_from_db))

        loan.monthly_payment_amount = _calculate_fixed_monthly_payment(
            principal=loan.amount_drawn,
            monthly_net_rate=Decimal(str(loan.monthly_interest_rate)),
            bsmv_rate=bsmv_rate_decimal,
            term_months=loan.term_months
        )

        # Planı yeniden üret
        AmortizationSchedule.query.filter_by(loan_id=loan.id).delete()
        db.session.flush()
        _generate_and_save_amortization_schedule(loan)
        _update_loan_balance_from_payments(loan)

    db.session.commit()
    dinfo("loan.update.committed", loan_id=loan_id)
    return loan


def delete_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if loan:
        db.session.delete(loan)
        db.session.commit()
        dinfo("loan.delete.committed", loan_id=loan_id)
    else:
        dwarn("loan.delete.not_found", loan_id=loan_id)
    return loan


def get_loans_by_bank_id(bank_id, bank_account_id=None):
    q = Loan.query.join(BankAccount).filter(BankAccount.bank_id == bank_id)
    if bank_account_id:
        q = q.filter(BankAccount.id == bank_account_id)
    rows = q.all()
    dinfo("loan.by_bank", bank_id=bank_id, bank_account_id=bank_account_id, count=len(rows))
    return rows


# --- LOAN TYPE SERVICES ---

def get_all_loan_types():
    rows = LoanType.query.all()
    dinfo("loan_types.list", count=len(rows))
    return rows


def get_loan_type_by_id(loan_type_id):
    row = LoanType.query.get(loan_type_id)
    if not row:
        dwarn("loan_types.get.not_found", loan_type_id=loan_type_id)
    return row


def create_loan_type(data):
    if 'name' not in data or not str(data['name']).strip():
        dwarn("loan_types.create.bad_input")
        raise AppError("'name' zorunludur.", 400)
    new_loan_type = LoanType(name=data['name'])
    db.session.add(new_loan_type)
    db.session.commit()
    dinfo("loan_types.create.committed", id=new_loan_type.id)
    return new_loan_type


def update_loan_type(loan_type_id, data):
    loan_type = get_loan_type_by_id(loan_type_id)
    if not loan_type:
        return None
    loan_type.name = data.get('name', loan_type.name)
    db.session.commit()
    dinfo("loan_types.update.committed", id=loan_type_id)
    return loan_type


def delete_loan_type(loan_type_id):
    loan_type = get_loan_type_by_id(loan_type_id)
    if loan_type:
        db.session.delete(loan_type)
        db.session.commit()
        dinfo("loan_types.delete.committed", id=loan_type_id)
    else:
        dwarn("loan_types.delete.not_found", id=loan_type_id)
    return loan_type


# --- LOAN PAYMENT SERVICES ---

def get_payments_for_loan(loan_id: int, page: int = 1, per_page: int = 20):
    # Route tarafı loan var/yok kontrolünü 404 ile yapıyor; burada direkt listeleyelim.
    res = (LoanPayment.query
           .filter(LoanPayment.loan_id == loan_id)
           .order_by(LoanPayment.payment_date.desc())
           .paginate(page=page, per_page=per_page, error_out=False))
    dinfo("loan_payments.list", loan_id=loan_id, total=res.total, page=page, per_page=per_page)
    return res


def make_payment(loan_id: int,
                 amount_paid: Decimal,
                 payment_date: date,
                 payment_type: LoanPaymentType,
                 notes: str = None,
                 installment_id: int = None) -> Loan:
    loan = get_loan_by_id(loan_id)
    if not loan:
        dwarn("loan_payment.loan_not_found", loan_id=loan_id)
        raise ValueError(f"Loan with ID {loan_id} not found.")
    if loan.status == LoanStatus.PAID_IN_FULL:
        dwarn("loan_payment.already_paid", loan_id=loan_id)
        raise ValueError("This loan has already been paid in full.")

    # Düzenli taksit ödemesi ise taksit id zorunlu
    if payment_type == LoanPaymentType.REGULAR_INSTALLMENT and not installment_id:
        dwarn("loan_payment.missing_installment", loan_id=loan_id)
        raise ValueError("A regular installment payment must be linked to a specific installment.")

    amortization_schedule_entry = None
    if installment_id:
        amortization_schedule_entry = AmortizationSchedule.query.get(installment_id)
        if not amortization_schedule_entry or amortization_schedule_entry.loan_id != loan_id:
            dwarn("loan_payment.bad_installment", loan_id=loan_id, installment_id=installment_id)
            raise ValueError("Installment ID is invalid for this loan.")
        if amortization_schedule_entry.payment:
            dwarn("loan_payment.installment_already_paid", loan_id=loan_id, installment_id=installment_id)
            raise ValueError("This installment has already been paid.")

    # Basit dağıtım: düzenli taksitte planın payları, peşin ödemede tamamı anapara
    principal_paid = amortization_schedule_entry.principal_share if amortization_schedule_entry else Decimal('0.00')
    interest_paid = amortization_schedule_entry.interest_share if amortization_schedule_entry else Decimal('0.00')

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

    dinfo("loan_payment.committed",
          loan_id=loan.id,
          payment_id=new_payment.id,
          type=str(payment_type),
          amount=str(amount_paid),
          principal=str(principal_paid),
          interest=str(interest_paid))
    return loan


# --- AMORTIZATION SCHEDULE SERVICE ---

def get_amortization_schedule_for_loan(loan_id: int) -> list[AmortizationSchedule]:
    """
    Kredinin amortisman planını döndürür. Eksikse kendini iyileştirerek üretir.
    """
    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError("Kredi bulunamadı.")

    schedule = (AmortizationSchedule.query.filter_by(loan_id=loan_id)
                .options(joinedload(AmortizationSchedule.payment))
                .order_by(AmortizationSchedule.installment_number.asc())
                .all())

    if not schedule:
        dwarn("loan.schedule.missing", loan_id=loan_id)
        _generate_and_save_amortization_schedule(loan)
        db.session.commit()
        schedule = (AmortizationSchedule.query.filter_by(loan_id=loan_id)
                    .options(joinedload(AmortizationSchedule.payment))
                    .order_by(AmortizationSchedule.installment_number.asc())
                    .all())
        dinfo("loan.schedule.regenerated", loan_id=loan_id, items=len(schedule))
    else:
        dinfo("loan.schedule.loaded", loan_id=loan_id, items=len(schedule))

    return schedule


def get_all_bank_accounts():
    rows = BankAccount.query.all()
    dinfo("bank_accounts.list", count=len(rows))
    return rows


def get_loan_history(start_date_str=None, end_date_str=None):
    """
    Ödeme tarihlerine göre kredi bakiyesi zaman çizelgesi üretir.
    """
    loans = Loan.query.all()
    dinfo("loan_history.build.start", loan_count=len(loans))

    individual_histories_raw = {}
    all_dates = set()

    for loan in loans:
        payments = sorted(
            [p for p in loan.payments if p.status != LoanPaymentStatus.REVERSED],
            key=lambda p: p.payment_date
        )
        history = []
        current_balance = loan.amount_drawn
        start_date = loan.date_drawn
        history.append({"date": start_date, "balance": current_balance})
        all_dates.add(start_date)

        for payment in payments:
            current_balance -= payment.principal_amount
            payment_date = payment.payment_date
            history.append({
                "date": payment_date,
                "balance": current_balance if current_balance > Decimal('0.0') else Decimal('0.0')
            })
            all_dates.add(payment_date)

        individual_histories_raw[loan.id] = history

    sorted_unique_dates = sorted(list(all_dates))
    final_individual_histories = {}
    total_balance_map = {d: Decimal('0.0') for d in sorted_unique_dates}

    for loan_id, points in individual_histories_raw.items():
        loan = next((l for l in loans if l.id == loan_id), None)
        if not loan:
            continue

        final_loan_history = []
        balance_map = {p['date']: p['balance'] for p in points}
        last_known_balance = Decimal('0.0')

        for rpt_date in sorted_unique_dates:
            if loan.date_drawn > rpt_date:
                final_loan_history.append({"date": rpt_date.strftime('%Y-%m-%d'), "balance": 0.0})
                continue

            if rpt_date in balance_map:
                last_known_balance = balance_map[rpt_date]

            final_loan_history.append({
                "date": rpt_date.strftime('%Y-%m-%d'),
                "balance": float(last_known_balance)
            })
            total_balance_map[rpt_date] += last_known_balance

        final_individual_histories[f"loan_id_{loan_id}"] = {
            "name": loan.name,
            "history": final_loan_history
        }

    total_balance_history = [
        {"date": dt.strftime('%Y-%m-%d'), "balance": float(bal)}
        for dt, bal in total_balance_map.items()
    ]

    out = {
        "total_balance_history": total_balance_history,
        "individual_loan_histories": final_individual_histories
    }
    dinfo("loan_history.build.done",
          dates=len(sorted_unique_dates),
          series=len(final_individual_histories),
          total_points=len(total_balance_history))
    return out

