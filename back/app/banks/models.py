from app import db
from datetime import datetime

class Bank(db.Model):
    __tablename__ = 'bank'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    logo_url = db.Column(db.String(255), nullable=True)
    accounts = db.relationship('BankAccount', backref='bank', lazy='joined', cascade="all, delete-orphan")
    logs = db.relationship('BankLog', back_populates='bank', lazy='dynamic', cascade="all, delete-orphan")

    def __init__(self, name, logo_url=None):
        self.name = name
        self.logo_url = logo_url

    def __repr__(self):
        return f"<Bank {self.name}>"

class BankAccount(db.Model):
    __tablename__ = 'bank_account'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    iban_number = db.Column(db.String(34), unique=True, nullable=False)
    overdraft_limit = db.Column(db.Numeric(10, 2), default=0)
    bank_id = db.Column(db.Integer, db.ForeignKey('bank.id'), nullable=False)
    credit_cards = db.relationship('CreditCard', back_populates='bank_account', lazy='joined', cascade="all, delete-orphan")
    
    daily_balances = db.relationship('DailyBalance', backref='account', lazy=True, cascade="all, delete-orphan")
    status_history = db.relationship('AccountStatusHistory', backref='account', lazy='dynamic', order_by='AccountStatusHistory.start_date.desc()', cascade="all, delete-orphan")

    def __init__(self, name, bank_id, iban_number, overdraft_limit=0):
        self.name = name
        self.bank_id = bank_id
        self.iban_number = iban_number
        self.overdraft_limit = overdraft_limit

    def __repr__(self):
        return f"<BankAccount {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'bank_id': self.bank_id,
            'iban_number': self.iban_number,
            'overdraft_limit': float(self.overdraft_limit),
            'bank_name': self.bank.name if self.bank else None
        }

    __table_args__ = (
        db.UniqueConstraint('bank_id', 'name', name='_bank_account_name_uc'),
    )

class DailyBalance(db.Model):
    __tablename__ = 'daily_balance'
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    morning_balance = db.Column(db.Numeric(10, 2), nullable=True)
    evening_balance = db.Column(db.Numeric(10, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('account_id', 'date', name='_account_date_uc'),
    )

    def __repr__(self):
        return f"<DailyBalance {self.account_id} - {self.date}>"

class AccountStatusHistory(db.Model):
    __tablename__ = 'account_status_history'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False) # 'Aktif', 'Pasif', 'Bloke'
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True) # Sadece 'Bloke' için
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AccountStatusHistory(id='{self.id}', account_id='{self.account_id}', status='{self.status}')>"
