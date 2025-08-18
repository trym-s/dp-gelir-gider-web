# app/expense/services.py
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date

from sqlalchemy import func, desc, asc
from sqlalchemy.orm import joinedload

from .. import db
from ..expense.models import Payment, Expense, ExpenseStatus
from ..errors import AppError

logger = logging.getLogger(__name__)

# ---- Money helpers ---------------------------------------------------------
CENT = Decimal("0.01")
ZERO = Decimal("0.00")

def D(x) -> Decimal:
    """safe Decimal conversion keeping strings precise."""
    if x is None:
        return ZERO
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))

def to_cents(x) -> Decimal:
    """quantize to 2 fraction digits with bank-like rounding."""
    return D(x).quantize(CENT, rounding=ROUND_HALF_UP)

def snap_small_epsilon(x: Decimal) -> Decimal:
    """
    If |x| < 0.005, snap to 0.00 and log once.
    This kills artifacts like 6e-16 that break equality tests.
    """
    q = to_cents(x)
    if q != ZERO:
        # if raw (pre-quantize) was tiny around zero, we still snap
        if abs(D(x)) < Decimal("0.005") and q != ZERO:
            logger.warning("epsilon-snap: raw=%s quantized=%s -> forcing 0.00", x, q)
            return ZERO
    return q

# ---- Service ---------------------------------------------------------------

class PaymentService:
    """Ödeme ile ilgili tüm veritabanı işlemlerini ve iş mantığını yönetir."""

    @staticmethod
    def _sum_paid(expense_id: int) -> Decimal:
        total = db.session.query(func.sum(Payment.payment_amount))\
            .filter(Payment.expense_id == expense_id)\
            .scalar()
        total = to_cents(total or ZERO)
        logger.debug("sum_paid(expense_id=%s) -> %s", expense_id, total)
        return total

    @staticmethod
    def _recalculate_expense_status(expense: Expense):
        """
        Giderin remaining/status/completed_at alanlarını cents-safe şekilde yeniden hesapla.
        """
        amount = to_cents(expense.amount)
        total_paid = PaymentService._sum_paid(expense.id)

        remaining_raw = amount - total_paid
        remaining = snap_small_epsilon(remaining_raw)

        # write back remaining as cents
        expense.remaining_amount = to_cents(remaining)

        prev_status = getattr(expense, "status", None)
        if remaining == ZERO:
            new_status = ExpenseStatus.PAID.name
        elif remaining < ZERO:
            new_status = ExpenseStatus.OVERPAID.name
        elif remaining >= amount:
            new_status = ExpenseStatus.UNPAID.name
        else:
            new_status = ExpenseStatus.PARTIALLY_PAID.name

        expense.status = new_status

        # completed_at kuralı: yalnız PAID iken set edilir, aksi halde None
        if new_status == ExpenseStatus.PAID.name:
            # son ödeme tarihini bul (yalnız silinmemiş ödemeler)
            last_paid_date = db.session.query(func.max(Payment.payment_date))\
                .filter(Payment.expense_id == expense.id)\
                .scalar()
            expense.completed_at = last_paid_date or date.today()
        else:
            expense.completed_at = None

        logger.info(
            "recalc expense id=%s amount=%s total_paid=%s remaining(raw=%s->%s) "
            "status: %s -> %s, completed_at=%s",
            expense.id, amount, total_paid, remaining_raw, expense.remaining_amount,
            prev_status, new_status, expense.completed_at
        )

    # ------------------------------------------------------------------ CRUD

    def get_by_id(self, payment_id: int) -> Payment:
        payment = Payment.query.get(payment_id)
        if not payment:
            raise AppError(f"Payment with id {payment_id} not found.", 404)
        return payment

    def create(self, expense_id: int, payment_data: dict) -> Payment:
        """
        Bir gidere yeni bir ödeme ekler ve gider durumunu günceller.
        payment_data: { payment_amount, payment_date, description? }
        """
        payment_amount = to_cents(payment_data.get("payment_amount"))
        payment_date = payment_data.get("payment_date")
        description = payment_data.get("description")

        if payment_amount <= ZERO:
            raise AppError("Payment amount must be positive.", 400)

        logger.info("create_payment(expense_id=%s, amount=%s, date=%s)",
                    expense_id, payment_amount, payment_date)

        try:
            expense = Expense.query.with_for_update().get(expense_id)
            if not expense:
                raise AppError(f"Expense with id {expense_id} not found.", 404)

            # optimistic guard: if already settled
            if to_cents(expense.remaining_amount) <= ZERO and expense.status == ExpenseStatus.PAID.name:
                raise AppError(f"Expense is already paid.", 400)

            new_payment = Payment(
                expense_id=expense.id,
                payment_amount=payment_amount,
                payment_date=payment_date,
                description=description,
            )
            db.session.add(new_payment)

            # recalc after insertion
            self._recalculate_expense_status(expense)

            db.session.commit()
            logger.info("payment created id=%s for expense=%s", new_payment.id, expense.id)
            return new_payment

        except AppError:
            db.session.rollback()
            logger.exception("AppError on payment create (expense_id=%s)", expense_id)
            raise
        except Exception as e:
            db.session.rollback()
            logger.exception("Unhandled error on payment create (expense_id=%s): %s", expense_id, e)
            raise AppError("Failed to create payment.", 500)

    def update(self, payment_id: int, payment_data: dict) -> Payment:
        """
        Ödeme günceller ve bağlı gideri yeniden hesaplar.
        payment_data: { payment_amount?, payment_date?, description? }
        """
        try:
            payment = Payment.query.get(payment_id)
            if not payment:
                raise AppError(f"Payment with id {payment_id} not found.", 404)

            expense = Expense.query.with_for_update().get(payment.expense_id)
            if not expense:
                raise AppError(f"Expense with id {payment.expense_id} not found.", 404)

            old_amount = to_cents(payment.payment_amount)

            if "payment_amount" in payment_data and payment_data["payment_amount"] is not None:
                payment.payment_amount = to_cents(payment_data["payment_amount"])
            if "payment_date" in payment_data and payment_data["payment_date"] is not None:
                payment.payment_date = payment_data["payment_date"]
            if "description" in payment_data:
                payment.description = payment_data.get("description")

            logger.info(
                "update_payment id=%s expense_id=%s old_amount=%s -> new_amount=%s",
                payment.id, expense.id, old_amount, to_cents(payment.payment_amount)
            )

            # recalc after update
            self._recalculate_expense_status(expense)

            db.session.commit()
            return payment

        except AppError:
            db.session.rollback()
            logger.exception("AppError on payment update (payment_id=%s)", payment_id)
            raise
        except Exception as e:
            db.session.rollback()
            logger.exception("Unhandled error on payment update (payment_id=%s): %s", payment_id, e)
            raise AppError("Failed to update payment.", 500)

    def delete(self, payment_id: int):
        """Ödemeyi siler ve gideri yeniden hesaplar."""
        try:
            payment = Payment.query.get(payment_id)
            if not payment:
                raise AppError(f"Payment with id {payment_id} not found.", 404)

            expense = Expense.query.with_for_update().get(payment.expense_id)
            if not expense:
                raise AppError(f"Expense with id {payment.expense_id} not found.", 404)

            logger.info("delete_payment id=%s expense_id=%s amount=%s",
                        payment.id, expense.id, to_cents(payment.payment_amount))

            db.session.delete(payment)

            # recalc after delete
            self._recalculate_expense_status(expense)

            db.session.commit()
            return {"message": "Payment deleted."}

        except AppError:
            db.session.rollback()
            logger.exception("AppError on payment delete (payment_id=%s)", payment_id)
            raise
        except Exception as e:
            db.session.rollback()
            logger.exception("Unhandled error on payment delete (payment_id=%s): %s", payment_id, e)
            raise AppError("Failed to delete payment.", 500)

    # ------------------------------------------------------------------ Query

    def list(self, filters: dict, page: int = 1, per_page: int = 20):
        """
        Ödemeleri filtreleyip sayfalar.
        filters: { expense_id?, date_start?, date_end?, sort_by?, sort_order? }
        """
        query = Payment.query.options(
            joinedload(Payment.expense)
        )

        if filters is None:
            filters = {}

        if "expense_id" in filters and filters["expense_id"]:
            query = query.filter(Payment.expense_id == filters["expense_id"])

        if "date_start" in filters and filters["date_start"]:
            query = query.filter(Payment.payment_date >= filters["date_start"])
        if "date_end" in filters and filters["date_end"]:
            query = query.filter(Payment.payment_date <= filters["date_end"])

        sort_by = filters.get("sort_by", "payment_date")
        sort_order = filters.get("sort_order", "desc")

        if hasattr(Payment, sort_by):
            col = getattr(Payment, sort_by)
            query = query.order_by(desc(col) if sort_order == "desc" else asc(col))
        else:
            query = query.order_by(desc(Payment.payment_date))

        logger.debug("payments.list filters=%s page=%s per_page=%s", filters, page, per_page)
        return query.paginate(page=page, per_page=per_page, error_out=False)

