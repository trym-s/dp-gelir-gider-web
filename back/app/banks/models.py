from app import db

class Bank(db.Model):
    __tablename__ = 'bank'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    logo_url = db.Column(db.String(255), nullable=True)
    accounts = db.relationship('BankAccount', backref='bank', lazy='dynamic', cascade="all, delete-orphan")

    def __init__(self, name, logo_url=None):
        self.name = name
        self.logo_url = logo_url

    def __repr__(self):
        return f"<Bank {self.name}>"

class BankAccount(db.Model):
    __tablename__ = 'bank_account'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    overdraft_limit = db.Column(db.Numeric(10, 2), default=0)
    bank_id = db.Column(db.Integer, db.ForeignKey('bank.id'), nullable=False)
    credit_cards = db.relationship('CreditCard', back_populates='bank_account', lazy='dynamic', cascade="all, delete-orphan")
    logs = db.relationship('BankLog', back_populates='bank_account', lazy='dynamic', cascade="all, delete-orphan")

    def __init__(self, name, bank_id, overdraft_limit=0):
        self.name = name
        self.bank_id = bank_id
        self.overdraft_limit = overdraft_limit

    def __repr__(self):
        return f"<BankAccount {self.name}>"
