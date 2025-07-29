from enum import Enum
from . import db # Ana db objesini import et
from datetime import datetime, date # datetime ve date importları birleştirildi
from sqlalchemy.ext.hybrid import hybrid_property
from decimal import Decimal # Finansal veriler için Decimal import edildi
from enum import Enum as PyEnum
# Redundant import kaldırıldı: from app import db

class ExpenseStatus(Enum):
    UNPAID = 0
    PAID = 1
    PARTIALLY_PAID = 2
    OVERPAID = 3

class AccountType(PyEnum):
    VADESIZ = "VADESIZ"
    KMH = "KMH"
    KREDI_KARTI = "KREDI_KARTI"
    
class Region(db.Model):
    __tablename__ = 'region'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    payment_types = db.relationship('PaymentType', backref='region', lazy=True)
    expenses = db.relationship('Expense', backref='region', lazy=True) # Expense'teki ilişki tanımı burada da olmalı
    incomes = db.relationship('Income', backref='region', lazy=True) # Income'daki ilişki tanımı burada da olmalı

    def __repr__(self):
        return f"<Region {self.name}>"

class PaymentType(db.Model):
    __tablename__ = 'payment_type'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)

    account_names = db.relationship('AccountName', backref='payment_type', lazy=True)
    expenses = db.relationship('Expense', backref='payment_type', lazy=True) # Expense'teki ilişki tanımı burada da olmalı

    def __repr__(self):
        return f"<PaymentType {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'region_id': self.region_id
        }

class AccountName(db.Model):
    __tablename__ = 'account_name'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    payment_type_id = db.Column(db.Integer, db.ForeignKey('payment_type.id'), nullable=False)

    budget_items = db.relationship('BudgetItem', backref='account_name', lazy=True)
    expenses = db.relationship('Expense', backref='account_name', lazy=True) # Expense'teki ilişki tanımı burada da olmalı
    incomes = db.relationship('Income', backref='account_name', lazy=True) # Income'daki ilişki tanımı burada da olmalı

    def __repr__(self):
        return f"<AccountName {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'payment_type_id': self.payment_type_id
        }

class BudgetItem(db.Model):
    __tablename__ = 'budget_item'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'), nullable=False)

    expenses = db.relationship('Expense', backref='budget_item', lazy=True) # Expense'teki ilişki tanımı burada da olmalı
    incomes = db.relationship('Income', backref='budget_item', lazy=True) # Income'daki ilişki tanımı burada da olmalı

    def __repr__(self):
        return f"<BudgetItem {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'account_name_id': self.account_name_id
        }

class ExpenseGroup(db.Model):
    __tablename__ = 'expense_group'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expenses = db.relationship('Expense', backref='group', lazy=True)

    def __repr__(self):
        return f"<ExpenseGroup {self.name}>"

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    payment_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expense = db.relationship('Expense', back_populates='payments')

    def to_dict(self):
        return {
            'id': self.id,
            'expense_id': self.expense_id,
            'payment_amount': float(self.payment_amount),
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'description': self.description,
            'expense': {
                'id': self.expense.id,
                'description': self.expense.description,
                'status': self.expense.status,
                'region': {'name': self.expense.region.name if self.expense.region else '-'},
                'account_name': {'name': self.expense.account_name.name if self.expense.account_name else '-'},
                'budget_item': {'name': self.expense.budget_item.name if self.expense.budget_item else '-'},
                'payment_type': {'name': self.expense.payment_type.name if self.expense.payment_type else '-'}
            }
        }

class Expense(db.Model):
    __tablename__ = 'expense'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('expense_group.id'))
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'))
    payment_type_id = db.Column(db.Integer, db.ForeignKey('payment_type.id'))
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'))
    budget_item_id = db.Column(db.Integer, db.ForeignKey('budget_item.id'))
    remaining_amount = db.Column(db.Numeric(10,2), default=0)
    description = db.Column(db.String(255))
    date = db.Column(db.Date)
    amount = db.Column(db.Numeric(10,2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.Date, nullable=True)

    status = db.Column(db.String(20), nullable=False, default=ExpenseStatus.UNPAID.name)
    payments = db.relationship('Payment', back_populates='expense', cascade="all, delete-orphan")

    # İlişkileri tanımla (bu kısım zaten vardı)
    # region = db.relationship('Region', backref='expenses') # backref tanımları yukarıda Region modelinde yapıldı
    # payment_type = db.relationship('PaymentType', backref='expenses')
    # account_name = db.relationship('AccountName', backref='expenses')
    # budget_item = db.relationship('BudgetItem', backref='expenses')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.remaining_amount is None:
            self.remaining_amount = self.amount

    def __repr__(self):
        return f"<Expense {self.description} - {self.amount}>"

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'region_id': self.region_id,
            'payment_type_id': self.payment_type_id,
            'account_name_id': self.account_name_id,
            'budget_item_id': self.budget_item_id,
            'remaining_amount': float(self.remaining_amount),
            'description': self.description,
            'date': self.date.isoformat() if self.date else None,
            'amount': float(self.amount),
            'status': self.status,
            'payments': [p.to_dict() for p in self.payments],
            'region': {'name': self.region.name} if self.region else None,
            'payment_type': {'name': self.payment_type.name} if self.payment_type else None,
            'account_name': {'name': self.account_name.name} if self.account_name else None,
            'budget_item': {'name': self.budget_item.name} if self.budget_item else None
        }

class Company(db.Model):
    __tablename__ = 'company'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)

    incomes = db.relationship('Income', backref='company', lazy=True) # Income'daki ilişki tanımı burada da olmalı

    def __repr__(self):
        return f"<Company {self.name}>"

class IncomeStatus(Enum):
    UNRECEIVED = 0
    RECEIVED = 1
    PARTIALLY_RECEIVED = 2
    OVER_RECEIVED = 3

class Income(db.Model):
    __tablename__ = 'income'
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    received_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(db.Enum(IncomeStatus), nullable=False, default=IncomeStatus.UNRECEIVED)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'), nullable=False)
    budget_item_id = db.Column(db.Integer, db.ForeignKey('budget_item.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)

    receipts = db.relationship('IncomeReceipt', back_populates='income', cascade="all, delete-orphan")
    
    # İlişkileri tanımla (bu kısım zaten vardı)
    # company = db.relationship('Company', backref='incomes') # backref tanımları yukarıda Company modelinde yapıldı
    # region = db.relationship('Region', backref='incomes')
    # account_name = db.relationship('AccountName', backref='incomes')
    # budget_item = db.relationship('BudgetItem', backref='incomes')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.received_amount is None:
            self.received_amount = 0

    @hybrid_property
    def remaining_amount(self):
        return self.total_amount - self.received_amount

    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'total_amount': float(self.total_amount),
            'received_amount': float(self.received_amount),
            'remaining_amount': float(self.remaining_amount),
            'status': self.status.name,
            'date': self.date.isoformat() if self.date else None,
            'company': {'name': self.company.name} if self.company else None,
            'region': {'name': self.region.name} if self.region else None,
            'account_name': {'name': self.account_name.name} if self.account_name else None,
            'budget_item': {'name': self.budget_item.name} if self.budget_item else None,
            'receipts': [r.to_dict() for r in self.receipts]
        }

class IncomeReceipt(db.Model):
    __tablename__ = 'income_receipt'
    id = db.Column(db.Integer, primary_key=True)
    income_id = db.Column(db.Integer, db.ForeignKey('income.id'), nullable=False)
    receipt_amount = db.Column(db.Numeric(10, 2), nullable=False)
    receipt_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    income = db.relationship('Income', back_populates='receipts')

    def to_dict(self):
        return {
            'id': self.id,
            'income_id': self.income_id,
            'receipt_amount': float(self.receipt_amount),
            'receipt_date': self.receipt_date.isoformat() if self.receipt_date else None,
            'notes': self.notes,
            'income': {
                'id': self.income.id,
                'description': self.income.description,
                'status': self.income.status.name,
                'company': {'name': self.income.company.name if self.income.company else '-'},
                'region': {'name': self.income.region.name if self.income.region else '-'},
                'account_name': {'name': self.income.account_name.name if self.income.account_name else '-'},
                'budget_item': {'name': self.income.budget_item.name if self.income.budget_item else '-'}
            }
        }

class Bank(db.Model):
    __tablename__ = 'banks'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    accounts = db.relationship('Account', backref='bank', lazy=True, cascade="all, delete-orphan")
    logs = db.relationship('BankLog', backref='bank', lazy=True, cascade="all, delete-orphan")

class BankLog(db.Model):
    __tablename__ = 'bank_log'
    id = db.Column(db.Integer, primary_key=True)
    bank_id = db.Column(db.Integer, db.ForeignKey('banks.id'), nullable=False)
    morning_amount_try = db.Column(db.Numeric(10, 2), default=0)
    evening_amount_try = db.Column(db.Numeric(10, 2), default=0)
    morning_amount_usd = db.Column(db.Numeric(10, 2), default=0)
    evening_amount_usd = db.Column(db.Numeric(10, 2), default=0)
    morning_amount_eur = db.Column(db.Numeric(10, 2), default=0)
    evening_amount_eur = db.Column(db.Numeric(10, 2), default=0)
    date = db.Column(db.Date, default=date.today)

class CardBrand(db.Model):
    __tablename__ = 'card_brands'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    credit_cards = db.relationship('CreditCard', backref='brand', lazy=True)

class Account(db.Model):
    __tablename__ = 'accounts'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    bank_id = db.Column(db.Integer, db.ForeignKey('banks.id'), nullable=False)
    iban_number = db.Column(db.String(34), nullable=True, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    daily_balances = db.relationship('DailyBalance', backref='account', lazy=True, cascade="all, delete-orphan")
    kmh_limits = db.relationship('KmhLimit', backref='account', lazy=True, cascade="all, delete-orphan")
    credit_cards = db.relationship('CreditCard', backref='account', lazy=True, cascade="all, delete-orphan")
    __table_args__ = (db.UniqueConstraint('bank_id', 'name', name='_bank_account_name_uc'),)

class KmhLimit(db.Model):
    __tablename__ = 'kmh_limits'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    kmh_limit = db.Column(db.Numeric(15, 2), nullable=False)
    statement_day = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    daily_risks = db.relationship('DailyRisk', backref='kmh_limit', lazy=True, cascade="all, delete-orphan")

class CreditCard(db.Model):
    __tablename__ = 'credit_card'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    card_brand_id = db.Column(db.Integer, db.ForeignKey('card_brands.id'), nullable=False)
    credit_card_limit = db.Column(db.Numeric(15, 2), nullable=False)
    cash_advance_limit = db.Column(db.Numeric(15, 2), nullable=False)
    statement_day = db.Column(db.Integer, nullable=False)
    due_day = db.Column(db.Integer, nullable=False)
    expiration_date = db.Column(db.Date, nullable=False)
    credit_card_no = db.Column(db.String(255), nullable=False)
    cvc = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    daily_limits = db.relationship('DailyCreditCardLimit', backref='credit_card', lazy=True, cascade="all, delete-orphan")

class StatusHistory(db.Model):
    __tablename__ = 'status_history'
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False, default=date.today)
    end_date = db.Column(db.Date, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    subject_id = db.Column(db.Integer, nullable=False)
    subject_type = db.Column(db.String(50), nullable=False)


# --- GÜNLÜK KAYIT MODELLERİ ---

class DailyBalance(db.Model):
    __tablename__ = 'daily_balances'
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    morning_balance = db.Column(db.Numeric(15, 2), nullable=True)
    evening_balance = db.Column(db.Numeric(15, 2), nullable=True)
    __table_args__ = (db.UniqueConstraint('account_id', 'entry_date', name='_account_date_uc'),)

class DailyRisk(db.Model):
    __tablename__ = 'daily_risks'
    id = db.Column(db.Integer, primary_key=True)
    kmh_limit_id = db.Column(db.Integer, db.ForeignKey('kmh_limits.id'), nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    morning_risk = db.Column(db.Numeric(15, 2), nullable=True)
    evening_risk = db.Column(db.Numeric(15, 2), nullable=True)
    __table_args__ = (db.UniqueConstraint('kmh_limit_id', 'entry_date', name='_kmh_risk_date_uc'),)

class DailyCreditCardLimit(db.Model):
    __tablename__ = 'daily_credit_card_limits'
    id = db.Column(db.Integer, primary_key=True)
    credit_card_id = db.Column(db.Integer, db.ForeignKey('credit_card.id'), nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    morning_limit = db.Column(db.Numeric(15, 2), nullable=True)
    evening_limit = db.Column(db.Numeric(15, 2), nullable=True)
    __table_args__ = (db.UniqueConstraint('credit_card_id', 'entry_date', name='_cc_limit_date_uc'),)
