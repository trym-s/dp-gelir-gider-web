from enum import Enum
from . import db
from datetime import datetime

class ExpenseStatus(Enum):
    UNPAID = 0
    PAID = 1
    PARTIALLY_PAID = 2
    OVERPAID = 3


class Region(db.Model):
    __tablename__ = 'region'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    payment_types = db.relationship('PaymentType', backref='region', lazy=True)

    def __repr__(self):
        return f"<Region {self.name}>"
    
    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            d[column.name] = getattr(self, column.name)
        return d

class PaymentType(db.Model):
    __tablename__ = 'payment_type'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)

    account_names = db.relationship('AccountName', backref='payment_type', lazy=True)

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
    
    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            d[column.name] = getattr(self, column.name)
        return d

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    payment_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expense = db.relationship('Expense', back_populates='payments')

    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            d[column.name] = getattr(self, column.name)
        return d

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

    status = db.Column(db.String(20), nullable=False, default=ExpenseStatus.UNPAID.name)
    payments = db.relationship('Payment', back_populates='expense', cascade="all, delete-orphan")

    # İlişkileri tanımla
    region = db.relationship('Region', backref='expenses')
    payment_type = db.relationship('PaymentType', backref='expenses')
    account_name = db.relationship('AccountName', backref='expenses')
    budget_item = db.relationship('BudgetItem', backref='expenses')

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
            'status': self.status
        }

class Company(db.Model):
    __tablename__ = 'company'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    # Şirketle ilgili vergi no, adres gibi ek alanlar eklenebilir

    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            d[column.name] = getattr(self, column.name)
        return d

class IncomeStatus(Enum):
    UNRECEIVED = 0      # Tahsil Edilmedi
    RECEIVED = 1        # Tahsil Edildi
    PARTIALLY_RECEIVED = 2 # Kısmen Tahsil Edildi
    OVER_RECEIVED = 3   # Fazla Tahsil Edildi

class Income(db.Model):
    __tablename__ = 'income'
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    received_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0) # Alınan tutar
    status = db.Column(db.Enum(IncomeStatus), nullable=False, default=IncomeStatus.UNRECEIVED)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'), nullable=False)
    budget_item_id = db.Column(db.Integer, db.ForeignKey('budget_item.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False) # Yeni ilişki

    receipts = db.relationship('IncomeReceipt', back_populates='income', cascade="all, delete-orphan")
    
    # İlişkili nesneleri ORM katmanında tanımla
    company = db.relationship('Company', backref='incomes')
    region = db.relationship('Region', backref='incomes')
    account_name = db.relationship('AccountName', backref='incomes')
    budget_item = db.relationship('BudgetItem', backref='incomes')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.received_amount is None:
            self.received_amount = 0

    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            d[column.name] = getattr(self, column.name)
        return d

## expense için payment ne ise income için income receipt bu.
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
        d = {}
        for column in self.__table__.columns:
            d[column.name] = getattr(self, column.name)
        return d
