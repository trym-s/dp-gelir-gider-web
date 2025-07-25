from datetime import datetime
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.ext.hybrid import hybrid_property
from app import db
from app.banks.models import BankAccount

class CardBrand(db.Model):
    __tablename__ = 'card_brand'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    logo_url = db.Column(db.String(255), nullable=True)  # URL'ler için
    icon_component_name = db.Column(db.String(50), nullable=True) # react-icons bileşen adları için

    def __repr__(self):
        return f"<CardBrand {self.name}>"

class CreditCard(db.Model):
    __tablename__ = 'credit_card'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    credit_card_no = db.Column(db.String(25), nullable=True)
    cvc = db.Column(db.Integer, nullable=True)
    expiration_date = db.Column(db.String(5), nullable=True)
    limit = db.Column(db.Numeric(10, 2), nullable=False)
    cash_advance_limit = db.Column(db.Numeric(10, 2), default=0)
    statement_day = db.Column(db.Integer, nullable=False)
    due_day = db.Column(db.Integer, nullable=False)

    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    payment_type_id = db.Column(db.Integer, db.ForeignKey('payment_type.id'), nullable=False)
    card_brand_id = db.Column(db.Integer, db.ForeignKey('card_brand.id'), nullable=True)
    
    transactions = db.relationship('CreditCardTransaction', backref='credit_card', lazy='dynamic', cascade="all, delete-orphan")
    payment_type = db.relationship('PaymentType', backref=db.backref('credit_card', uselist=False))
    card_brand = db.relationship('CardBrand', backref='credit_cards')
    bank_account = db.relationship('BankAccount', back_populates='credit_cards')

    @hybrid_property
    def current_debt(self):
        session = db.object_session(self)
        if not session:
            return Decimal('0.0')

        expenses = session.query(func.sum(CreditCardTransaction.amount)).filter(
            CreditCardTransaction.credit_card_id == self.id,
            CreditCardTransaction.type == 'EXPENSE'
        ).scalar() or Decimal('0.0')
        payments = session.query(func.sum(CreditCardTransaction.amount)).filter(
            CreditCardTransaction.credit_card_id == self.id,
            CreditCardTransaction.type == 'PAYMENT'
        ).scalar() or Decimal('0.0')
        return expenses - payments

    @hybrid_property
    def available_limit(self):
        return self.limit - self.current_debt
        
    def __repr__(self):
        return f"<CreditCard {self.name}>"

class CreditCardTransaction(db.Model):
    __tablename__ = 'credit_card_transaction'
    id = db.Column(db.Integer, primary_key=True)
    credit_card_id = db.Column(db.Integer, db.ForeignKey('credit_card.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.String(255))
    transaction_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    type = db.Column(db.String(20), nullable=False)

    def __repr__(self):
        return f"<CreditCardTransaction {self.description}>"
