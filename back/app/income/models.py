# back/app/income/models.py
from enum import Enum
from app import db
from datetime import datetime
from sqlalchemy.ext.hybrid import hybrid_property

class PaymentTimelinessStatus(Enum):
    EARLY = "EARLY"
    ON_TIME = "ON_TIME"
    LATE = "LATE"

class IncomeStatus(Enum):
    UNRECEIVED = 0
    RECEIVED = 1
    PARTIALLY_RECEIVED = 2
    OVER_RECEIVED = 3

    @classmethod
    def _missing_(cls, value):
        if value == 'Kismen Ödendi':
            return cls.PARTIALLY_RECEIVED
        return super()._missing_(value)

class IncomeGroup(db.Model):
    __tablename__ = 'income_group'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    incomes = db.relationship('Income', back_populates='group', lazy=True)

    def __repr__(self):
        return f"<IncomeGroup {self.name}>"
    

class Currency(Enum):
    TRY = "TRY"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    AED = "AED"

class Income(db.Model):
    __tablename__ = 'income'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('income_group.id'))
    group = db.relationship('IncomeGroup', back_populates='incomes')
    invoice_name = db.Column(db.String(255), nullable=False)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.Enum(Currency), nullable=False, default=Currency.TRY)
    received_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(db.Enum(IncomeStatus), nullable=False, default=IncomeStatus.UNRECEIVED)
    timeliness_status = db.Column(db.Enum(PaymentTimelinessStatus), nullable=True)
    issue_date = db.Column(db.Date, nullable=False) 
    due_date = db.Column(db.Date, nullable=True)
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
            'timeliness_status': self.timeliness_status.name if self.timeliness_status else None,
            'currency': self.currency.name,
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
                'invoice_name': self.income.invoice_name,
                'status': self.income.status.name,
                'customer': {'name': self.income.customer.name if self.income.customer else '-'},
                'region': {'name': self.income.region.name if self.income.region else '-'},
                'account_name': {'name': self.income.account_name.name if self.income.account_name else '-'},
                'budget_item': {'name': self.income.budget_item.name if self.income.budget_item else '-'}
            }
        }


class IncomeTransactionPDF(db.Model):
    __tablename__ = 'income_transaction_pdf'
    id = db.Column(db.Integer, primary_key=True)
    
    # ******** DÜZELTİLEN SATIR ********
    # 'incomes.id' yerine, doğru tablo adı olan 'income.id' yazılmalı.
    income_id = db.Column(db.Integer, db.ForeignKey('income.id'), nullable=False, index=True)
    
    original_filename = db.Column(db.String(255), nullable=False)
    saved_filename = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(512), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<IncomeTransactionPDF {self.original_filename}>"
