
# app/expense/models.py
from __future__ import annotations

from enum import Enum as PyEnum
from datetime import datetime, date
from typing import Optional
from decimal import Decimal

from app import db
from sqlalchemy import select, func, event, literal
from sqlalchemy.orm import Session
from sqlalchemy.types import Enum as SAEnum
from sqlalchemy.ext.hybrid import hybrid_property


class Currency(PyEnum):
    TRY = "TRY"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    AED = "AED"


class TaxType(PyEnum):
    KDV = "KDV"
    TEVKIFAT = "TEVKIFAT"
    STOPAJ = "STOPAJ"
    OIV = "OIV"
    OTV = "OTV"
    OTHER = "OTHER"


class ExpenseStatus(PyEnum):
    UNPAID = "UNPAID"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERPAID = "OVERPAID"


# -----------------------
# Models
# -----------------------
class ExpenseGroup(db.Model):
    __tablename__ = "expense_group"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expenses = db.relationship("Expense", backref="group", lazy=True)

    def __repr__(self) -> str:
        return f"<ExpenseGroup {self.name}>"


class Payment(db.Model):
    __tablename__ = "payment"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False, index=True)
    payment_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expense = db.relationship("Expense", back_populates="payments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "payment_amount": float(self.payment_amount),
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "description": self.description,
            "expense": {
                "id": self.expense.id,
                "description": self.expense.description,
                "status": self.expense.status.value if isinstance(self.expense.status, PyEnum) else self.expense.status,
                "region": {"name": self.expense.region.name if self.expense.region else "-"},
                "account_name": {"name": self.expense.account_name.name if self.expense.account_name else "-"},
                "budget_item": {"name": self.expense.budget_item.name if self.expense.budget_item else "-"},
                "payment_type": {"name": self.expense.payment_type.name if self.expense.payment_type else "-"},
            },
        }


class Supplier(db.Model):
    __tablename__ = "supplier"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)


class Expense(db.Model):
    __tablename__ = "expense"

    id = db.Column(db.Integer, primary_key=True)

    group_id = db.Column(db.Integer, db.ForeignKey("expense_group.id"))
    region_id = db.Column(db.Integer, db.ForeignKey("region.id"))
    payment_type_id = db.Column(db.Integer, db.ForeignKey("payment_type.id"))
    account_name_id = db.Column(db.Integer, db.ForeignKey("account_name.id"))
    budget_item_id = db.Column(db.Integer, db.ForeignKey("budget_item.id"))
    supplier_id = db.Column(db.Integer, db.ForeignKey("supplier.id"))

    remaining_amount = db.Column(db.Numeric(10, 2), default=0)
    description = db.Column(db.String(255))
    date = db.Column(db.Date)
    amount = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.Date, nullable=True)

    # IMPORTANT: nullable=True; DB default yok. Uygulama tarafında TRY fallback.
    currency = db.Column(
        SAEnum(Currency, name="currency_enum", native_enum=False, validate_strings=True),
        nullable=True,
        default=Currency.TRY,  # python-side default (alan omit edilirse)
    )

    status = db.Column(
        SAEnum(ExpenseStatus, name="expense_status", native_enum=False, validate_strings=True),
        nullable=False,
        default=ExpenseStatus.UNPAID,
    )

    payments = db.relationship("Payment", back_populates="expense", cascade="all, delete-orphan")

    region = db.relationship("Region", backref="expenses")
    payment_type = db.relationship("PaymentType", backref="expenses")
    account_name = db.relationship("AccountName", backref="expenses")
    budget_item = db.relationship("BudgetItem", backref="expenses")
    supplier = db.relationship("Supplier", backref="expenses")

    # Expense import
    invoice_number = db.Column(db.String(50), unique=True, nullable=True)
    invoice_name = db.Column(db.Unicode(255), nullable=True, index=True)
    lines = db.relationship(
        "ExpenseLine",
        back_populates="expense",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Last payment date (scalar subquery)
    last_payment_date = db.column_property(
        select(func.max(Payment.payment_date))
        .where(Payment.expense_id == id)
        .correlate_except(Payment)
        .scalar_subquery()
    )

    # Taxes 1..N
    taxes = db.relationship(
        "ExpenseTax",
        back_populates="expense",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.remaining_amount is None:
            self.remaining_amount = self.amount

    # Read-time fallback: None -> TRY (Python ve SQL tarafında)
    @hybrid_property
    def currency_effective(self) -> Currency:
        return self.currency or Currency.TRY

    @currency_effective.expression
    def currency_effective(cls):
        # native_enum=False -> DB tarafı VARCHAR; COALESCE string bekler
        return func.coalesce(cls.currency, literal(Currency.TRY.value))

    def __repr__(self) -> str:
        return f"<Expense {self.description} - {self.amount}>"

    def to_dict(self) -> dict:
        # raw (DB'deki değer, None olabilir)
        currency_raw = (
            self.currency.value if isinstance(self.currency, PyEnum) else self.currency
        )
        # effective (fallback TRY)
        currency_eff = (
            self.currency_effective.value
            if isinstance(self.currency_effective, PyEnum)
            else self.currency_effective
        )
        return {
            "id": self.id,
            "group_id": self.group_id,
            "region_id": self.region_id,
            "payment_type_id": self.payment_type_id,
            "account_name_id": self.account_name_id,
            "budget_item_id": self.budget_item_id,
            "remaining_amount": float(self.remaining_amount) if self.remaining_amount is not None else 0.0,
            "description": self.description,
            "date": self.date.isoformat() if self.date else None,
            "amount": float(self.amount) if self.amount is not None else None,
            "status": self.status.value if isinstance(self.status, PyEnum) else self.status,
            "currency": currency_eff,            # UI için güvenli değer (NULL ise TRY)
            "currency_raw": currency_raw,        # debugging/rapor için istersen
            "payments": [p.to_dict() for p in self.payments],
            "region": {"name": self.region.name} if self.region else None,
            "payment_type": self.payment_type.to_dict() if hasattr(self.payment_type, "to_dict") and self.payment_type else (
                {"name": self.payment_type.name} if self.payment_type and hasattr(self.payment_type, "name") else None
            ),
            "account_name": {"name": self.account_name.name} if self.account_name else None,
            "budget_item": {"name": self.budget_item.name} if self.budget_item else None,
        }


class ExpenseTax(db.Model):
    __tablename__ = "expense_tax"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False, index=True)

    tax_type = db.Column(
        SAEnum(TaxType, name="tax_type", native_enum=False, validate_strings=True),
        nullable=False,
    )
    amount = db.Column(db.Numeric(12, 2), nullable=False)

    expense = db.relationship("Expense", back_populates="taxes")

    def __repr__(self) -> str:
        return f"<ExpenseTax {self.tax_type.value if isinstance(self.tax_type, PyEnum) else self.tax_type} - {self.amount}>"


class ExpenseLine(db.Model):
    __tablename__ = "expense_line"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False, index=True)

    item_name = db.Column(db.String(255), nullable=True)
    quantity = db.Column(db.Numeric(12, 3), nullable=True)
    unit_price = db.Column(db.Numeric(12, 2), nullable=True)
    discount = db.Column(db.Numeric(12, 2), nullable=True)
    kdv_amount = db.Column(db.Numeric(12, 2), nullable=True)
    tevkifat_amount = db.Column(db.Numeric(12, 2), nullable=True)
    otv_amount = db.Column(db.Numeric(12, 2), nullable=True)
    oiv_amount = db.Column(db.Numeric(12, 2), nullable=True)
    net_amount_try = db.Column(db.Numeric(12, 2), nullable=True)

    expense = db.relationship("Expense", back_populates="lines")


class ExpenseTransactionPDF(db.Model):
    __tablename__ = "expense_transaction_pdf"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    saved_filename = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(512), nullable=False)  # file system path
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<ExpenseTransactionPDF {self.original_filename}>"


# Explicit None -> TRY (INSERT sırasında)
@event.listens_for(Expense, "before_insert")
def _expense_currency_default(mapper, connection, target: Expense):
    if target.currency is None:
        target.currency = Currency.TRY


@event.listens_for(db.session.__class__, "before_flush")
def expense_completed_at_autoset(session: Session, flush_context, instances):
    """
    Eğer bir Expense veya ilgili Payment'larında değişiklik varsa:
      - total_paid = SUM(payment.payment_amount) (silinmekte olanlar hariç)
      - remaining = amount - total_paid
      - Eğer status == PAID ve remaining <= 0  => completed_at = son payment_date
      - Aksi halde completed_at = None
    """
    from .models import Expense, Payment, ExpenseStatus  # local import to avoid cycles

    affected: set[Expense] = set()

    # 1) Değişen/eklenen/silinen objelerden ilgili Expense'leri topla
    for obj in list(session.new) + list(session.dirty) + list(session.deleted):
        if isinstance(obj, Expense):
            affected.add(obj)
        elif isinstance(obj, Payment):
            exp = obj.expense or session.get(Expense, obj.expense_id)
            if exp is not None:
                affected.add(exp)

    if not affected:
        return

    deleted_payments = {p for p in session.deleted if isinstance(p, Payment)}

    for exp in affected:
        # amount ve paid hesapla (deleted olan Payment'ları dışla)
        amt = Decimal(str(exp.amount or 0))
        payments_alive = [p for p in (exp.payments or []) if p not in deleted_payments]

        total_paid = sum(Decimal(str(p.payment_amount or 0)) for p in payments_alive)
        last_paid_date = None
        if payments_alive:
            dates = [p.payment_date for p in payments_alive if p.payment_date]
            last_paid_date = max(dates) if dates else None

        remaining = amt - total_paid

        # exp.remaining_amount = remaining  # istersen senkron tut

        # Kural: status PAID ve borç fiilen yoksa tamamlanma tarihini yaz
        if exp.status == ExpenseStatus.PAID and remaining <= 0:
            exp.completed_at = last_paid_date or date.today()
        else:
            exp.completed_at = None

