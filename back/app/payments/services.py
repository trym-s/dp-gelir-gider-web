# app/expense/services.py
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date

from sqlalchemy import func, desc, asc
from sqlalchemy.orm import joinedload

from .. import db
from ..expense.models import Payment, Expense, ExpenseStatus
from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr

# ---- Money helpers ---------------------------------------------------------
CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def _coerce_date(v):
    if v is None or isinstance(v, date):
        return v
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, str):
        try:
            return date.fromisoformat(v)
        except ValueError:
            raise AppError("payment_date must be YYYY-MM-DD", 400)
    raise AppError("payment_date has invalid type", 400)

def D(x) -> Decimal:
    """Safe Decimal conversion keeping strings precise."""
    if x is None:
        return ZERO
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))

def to_cents(x) -> Decimal:
    """Quantize to 2 fraction digits with bank-like rounding."""
    return D(x).quantize(CENT, rounding=ROUND_HALF_UP)

def snap_small_epsilon(x: Decimal) -> Decimal:
    """
    If |x| < 0.005, snap to 0.00 and log once.
    This kills artifacts like 6e-16 that break equality tests.
    """
    q = to_cents(x)
    if q != ZERO:
        if abs(D(x)) < Decimal("0.005") and q != ZERO:
            dwarn(
                "epsilon-snap forcing 0.00",
                extra={"extra": {"raw": str(x), "quantized": str(q)}}
            )
            return ZERO
    return q



# ---- Service ---------------------------------------------------------------

class PaymentService:
    """All DB operations & business logic around payments."""

    @staticmethod
    def _sum_paid(expense_id: int) -> Decimal:
        total = db.session.query(func.sum(Payment.payment_amount))\
            .filter(Payment.expense_id == expense_id)\
            .scalar()
        total = to_cents(total or ZERO)
        dinfo("sum_paid", expense_id=expense_id, total=str(total))
        return total

    @staticmethod
    def _recalculate_expense_status(expense: Expense):
        """
        Recompute remaining/status/completed_at in a cents-safe way.
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

        # completed_at rule: set only when PAID, else None
        if new_status == ExpenseStatus.PAID.name:
            last_paid_date = db.session.query(func.max(Payment.payment_date))\
                .filter(Payment.expense_id == expense.id)\
                .scalar()
            expense.completed_at = last_paid_date or date.today()
        else:
            expense.completed_at = None

        dinfo(
            "expense recalculated",
            expense_id=expense.id,
            amount=str(amount),
            total_paid=str(total_paid),
            remaining_raw=str(remaining_raw),
            remaining=str(expense.remaining_amount),
            status_before=prev_status,
            status_after=new_status,
            completed_at=str(expense.completed_at)
        )

    # ------------------------------------------------------------------ CRUD

    def get_by_id(self, payment_id: int) -> Payment:
        payment = Payment.query.get(payment_id)
        if not payment:
            raise AppError(f"Payment with id {payment_id} not found.", 404)
        return payment

    @service_logger
    def create(self, expense_id: int, payment_data: dict) -> Payment:
        """
        Create a new payment for an expense and update expense status.
        payment_data: { payment_amount, payment_date, description? }
        - AppError is used ONLY for user/business (4xx) cases.
        - Unexpected exceptions bubble up to the global error handler.
        """
        payment_amount = to_cents(payment_data.get("payment_amount"))
        payment_date = _coerce_date(payment_data.get("payment_date"))
        description = payment_data.get("description")

        if payment_amount <= ZERO:
            raise AppError("Payment amount must be positive.", 400)

        dinfo(
            "create payment start",
            expense_id=expense_id,
            amount=str(payment_amount),
            date=str(payment_date)
        )

        try:
            expense = Expense.query.with_for_update().get(expense_id)
            if not expense:
                raise AppError(f"Expense with id {expense_id} not found.", 404)

            # optimistic guard: if already settled
            if to_cents(expense.remaining_amount) <= ZERO and expense.status == ExpenseStatus.PAID.name:
                raise AppError("Expense is already paid.", 400)

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
            dinfo(
                "create payment committed",
                payment_id=new_payment.id,
                expense_id=expense.id,
                new_expense_status=expense.status,
                remaining=str(expense.remaining_amount),
            )
            return new_payment

        except AppError as ae:
            db.session.rollback()
            dwarn(
                "business error on payment create (rolled back)",
                expense_id=expense_id,
                reason=ae.message
            )
            raise
        except Exception as e:
            db.session.rollback()
            derr(
                "unhandled error on payment create (rolled back)",
                err=e,
                expense_id=expense_id,
                amount=str(payment_amount),
            )
            # DO NOT wrap into AppError(500). Let global handler log root cause and format the response.
            raise

    def update(self, payment_id: int, payment_data: dict) -> Payment:
        """
        Update a payment and recompute its expense.
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
                payment.payment_date = _coerce_date(payment_data["payment_date"])
            if "description" in payment_data:
                payment.description = payment_data.get("description")

            dinfo(
                "update payment start",
                payment_id=payment.id,
                expense_id=expense.id,
                amount_before=str(old_amount),
                amount_after=str(to_cents(payment.payment_amount))
            )

            # recalc after update
            self._recalculate_expense_status(expense)

            db.session.commit()
            dinfo(
                "update payment committed",
                payment_id=payment.id,
                expense_id=expense.id,
                new_expense_status=expense.status,
                remaining=str(expense.remaining_amount),
            )
            return payment

        except AppError as ae:
            db.session.rollback()
            dwarn(
                "business error on payment update (rolled back)",
                payment_id=payment_id,
                reason=ae.message
            )
            raise
        except Exception as e:
            db.session.rollback()
            derr(
                "unhandled error on payment update (rolled back)",
                err=e,
                payment_id=payment_id
            )
            raise

    def delete(self, payment_id: int):
        """Delete a payment and recompute its expense."""
        try:
            payment = Payment.query.get(payment_id)
            if not payment:
                raise AppError(f"Payment with id {payment_id} not found.", 404)

            expense = Expense.query.with_for_update().get(payment.expense_id)
            if not expense:
                raise AppError(f"Expense with id {payment.expense_id} not found.", 404)

            dinfo(
                "delete payment start",
                payment_id=payment.id,
                expense_id=expense.id,
                amount=str(to_cents(payment.payment_amount))
            )

            db.session.delete(payment)

            # recalc after delete
            self._recalculate_expense_status(expense)

            db.session.commit()
            dinfo(
                "delete payment committed",
                payment_id=payment.id,
                expense_id=expense.id,
                new_expense_status=expense.status,
                remaining=str(expense.remaining_amount),
            )
            return {"message": "Payment deleted."}

        except AppError as ae:
            db.session.rollback()
            dwarn(
                "business error on payment delete (rolled back)",
                payment_id=payment_id,
                reason=ae.message
            )
            raise
        except Exception as e:
            db.session.rollback()
            derr(
                "unhandled error on payment delete (rolled back)",
                err=e,
                payment_id=payment_id
            )
            raise

    # ------------------------------------------------------------------ Query

    def list(self, filters: dict, page: int = 1, per_page: int = 20):
        """
        List payments with filters/pagination.
        filters: { expense_id?, date_start?, date_end?, sort_by?, sort_order? }
        """
        query = Payment.query.options(joinedload(Payment.expense))

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

        dinfo("payments.list", filters=filters, page=page, per_page=per_page)
        return query.paginate(page=page, per_page=per_page, error_out=False)

