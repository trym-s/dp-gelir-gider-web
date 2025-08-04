from app import db
from datetime import datetime
from enum import Enum as PyEnum

# Enum for account types
class BankAccountType(PyEnum):
    VADESIZ = "VADESIZ"
    KMH = "KMH"
    KREDI_KARTI = "KREDI_KARTI"

class Bank(db.Model):
    # CORRECTED: Tablename is plural as per convention
    __tablename__ = 'bank'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    logo_url = db.Column(db.String(255), nullable=True)
    # Relationship to the corrected BankAccount model
    accounts = db.relationship('BankAccount', backref='bank', lazy=True, cascade="all, delete-orphan")
    logs = db.relationship('BankLog', back_populates='bank', lazy='dynamic', cascade="all, delete-orphan")

class BankAccount(db.Model):
    # CORRECTED: Tablename reverted to 'bank_account' as requested
    __tablename__ = 'bank_account'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    bank_id = db.Column(db.Integer, db.ForeignKey('bank.id'), nullable=False)
    iban_number = db.Column(db.String(34), nullable=True, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    daily_balances = db.relationship('DailyBalance', backref='account', lazy=True, cascade="all, delete-orphan")
    kmh_limits = db.relationship('KmhLimit', backref='account', lazy=True, cascade="all, delete-orphan")
    credit_cards = db.relationship('CreditCard', back_populates='bank_account', lazy=True, cascade="all, delete-orphan")
    status_history = db.relationship(
        'StatusHistory',
        primaryjoin="and_(foreign(StatusHistory.subject_id)==BankAccount.id, StatusHistory.subject_type=='bank_account')",
        backref='bank_account',
        lazy='dynamic',
        order_by='StatusHistory.start_date.desc()',
        cascade="all, delete-orphan"
    )

    __table_args__ = (db.UniqueConstraint('bank_id', 'name', name='_bank_account_name_uc'),)

class KmhLimit(db.Model):
    __tablename__ = 'kmh_limits'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    kmh_limit = db.Column(db.Numeric(15, 2), nullable=False)
    statement_day = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    daily_risks = db.relationship('DailyRisk', backref='kmh_limit', lazy=True, cascade="all, delete-orphan")

class DailyBalance(db.Model):
    __tablename__ = 'daily_balances'
    id = db.Column(db.Integer, primary_key=True)
    # CORRECTED: ForeignKey points to the correct table name 'bank_account.id'
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    morning_balance = db.Column(db.Numeric(15, 2), nullable=True)
    evening_balance = db.Column(db.Numeric(15, 2), nullable=True)
    __table_args__ = (db.UniqueConstraint('bank_account_id', 'entry_date', name='_daily_balances_uc'),)

class DailyRisk(db.Model):
    __tablename__ = 'daily_risks'
    id = db.Column(db.Integer, primary_key=True)
    kmh_limit_id = db.Column(db.Integer, db.ForeignKey('kmh_limits.id'), nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    morning_risk = db.Column(db.Numeric(15, 2), nullable=True)
    evening_risk = db.Column(db.Numeric(15, 2), nullable=True)
    __table_args__ = (db.UniqueConstraint('kmh_limit_id', 'entry_date', name='_kmh_risk_date_uc'),)

class StatusHistory(db.Model):
    __tablename__ = 'status_history' # Tablo adını da güncelleyelim.
    id = db.Column(db.Integer, primary_key=True)
    
    # Yeni, genel alanlar
    subject_id = db.Column(db.Integer, nullable=False, index=True)
    subject_type = db.Column(db.String(50), nullable=False, index=True) # Örn: 'bank_account', 'kmh_limit'

    # Geri kalan alanlar aynı
    status = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
