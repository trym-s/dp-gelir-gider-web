from enum import Enum
from app import db
from datetime import datetime

class ExpenseStatus(Enum):
    UNPAID = 0
    PAID = 1
    PARTIALLY_PAID = 2
    OVERPAID = 3

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
            'payment_type': self.payment_type.to_dict() if self.payment_type else None,
            'account_name': {'name': self.account_name.name} if self.account_name else None,
            'budget_item': {'name': self.budget_item.name} if self.budget_item else None
        }

class ExpenseTransactionPDF(db.Model):
    __tablename__ = 'expense_transaction_pdf' # YENİ TABLO ADI
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    saved_filename = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(512), nullable=False) # Bu alan dosya sistemindeki yolu tutar
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ExpenseTransactionPDF {self.original_filename}>"
