from enum import Enum
from . import db
from datetime import datetime
from sqlalchemy.ext.hybrid import hybrid_property
from werkzeug.security import generate_password_hash, check_password_hash

role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    users = db.relationship('User', backref='role', lazy='dynamic')
    
    permissions = db.relationship(
        'Permission', 
        secondary=role_permissions,
        lazy='subquery', 
        back_populates='roles'
    )
    
    def __repr__(self):
        return f'<Role {self.name}>'
    
class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    # Örn: 'expense:create', 'user:read', 'admin:access'
    name = db.Column(db.String(80), unique=True, nullable=False) 
    # Örn: 'Yeni gider oluşturma yetkisi'
    description = db.Column(db.String(255))

    # --- YENİ İLİŞKİ TANIMI ---
    # İlişkinin diğer tarafını da burada tanımlıyoruz.
    roles = db.relationship(
        'Role', 
        secondary=role_permissions, 
        back_populates='permissions'
    )
    # --- YENİ TANIM SONU ---

    def __repr__(self):
        return f'<Permission {self.name}>'    
    

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # 'role' sütununu 'role_id' foreign key'i ile değiştiriyoruz.
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role.name if self.role else None
        }

    def has_permission(self, permission_name):
        """Kullanıcının belirli bir izne sahip olup olmadığını kontrol eder."""
        if not self.role:
            return False
        return any(p.name == permission_name for p in self.role.permissions)
    
    

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
                'status': self.expense.status, # Correctly added status
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
            'status': self.status,
            'payments': [p.to_dict() for p in self.payments],
            'region': {'name': self.region.name} if self.region else None,
            'payment_type': {'name': self.payment_type.name} if self.payment_type else None,
            'account_name': {'name': self.account_name.name} if self.account_name else None,
            'budget_item': {'name': self.budget_item.name} if self.budget_item else None
        }

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    tax_number = db.Column(db.String(11), unique=True, nullable=True) 
    incomes = db.relationship('Income', back_populates='customer', lazy=True)
    
    
    def __repr__(self):
        return f'<Customer {self.name}>'

class IncomeStatus(Enum):
    UNRECEIVED = 0
    RECEIVED = 1
    PARTIALLY_RECEIVED = 2
    OVER_RECEIVED = 3

class Income(db.Model):
    __tablename__ = 'income'
    id = db.Column(db.Integer, primary_key=True)
    invoice_name = db.Column(db.String(255), nullable=False)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    received_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(db.Enum(IncomeStatus), nullable=False, default=IncomeStatus.UNRECEIVED)
    issue_date = db.Column(db.Date, nullable=False) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_receipt_date = db.Column(db.Date, nullable=True)

    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'), nullable=False)
    budget_item_id = db.Column(db.Integer, db.ForeignKey('budget_item.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    receipts = db.relationship('IncomeReceipt', back_populates='income', cascade="all, delete-orphan")
    
    customer = db.relationship('Customer', back_populates='incomes')
    region = db.relationship('Region', backref='incomes')
    account_name = db.relationship('AccountName', backref='incomes')
    budget_item = db.relationship('BudgetItem', backref='incomes')

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
            'invoice_name': self.invoice_name,
            'invoice_number': self.invoice_number,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'last_receipt_date': self.last_receipt_date.isoformat() if self.last_receipt_date else None,
            'total_amount': float(self.total_amount),
            'received_amount': float(self.received_amount),
            'remaining_amount': float(self.remaining_amount),
            'status': self.status.name,
            'customer': {'name': self.customer.name} if self.customer else None,
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
                # --- DEĞİŞEN ALANLAR ---
                'invoice_name': self.income.invoice_name, # description -> invoice_name
                'status': self.income.status.name,
                'customer': {'name': self.income.customer.name if self.income.customer else '-'}, # company -> customer
                # --- AYNI KALAN ALANLAR ---
                'region': {'name': self.income.region.name if self.income.region else '-'},
                'account_name': {'name': self.income.account_name.name if self.income.account_name else '-'},
                'budget_item': {'name': self.income.budget_item.name if self.income.budget_item else '-'}
            }
        }