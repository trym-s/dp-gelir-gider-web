# back/app/income/models.py
from enum import Enum
from app import db
from datetime import datetime
from sqlalchemy.ext.hybrid import hybrid_property

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

    incomes = db.relationship('Income', backref='group', lazy=True)

    def __repr__(self):
        return f"<IncomeGroup {self.name}>"

class Income(db.Model):
    __tablename__ = 'income'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('income_group.id'))
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
    
    company = db.relationship('Company', backref='incomes')
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
            'group_id': self.group_id,
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
