# /back/app/bank_logs/models.py
import enum
from app import db
from sqlalchemy import UniqueConstraint

class Period(enum.Enum):
    morning = "morning"
    evening = "evening"

class BankLog(db.Model):
    __tablename__ = 'bank_log'
    id = db.Column(db.Integer, primary_key=True)
    # CORRECTED: ForeignKey now points to 'banks.id' instead of 'bank.id'
    bank_id = db.Column(db.Integer, db.ForeignKey('bank.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    period = db.Column(db.Enum(Period), nullable=False)
    
    amount_try = db.Column(db.Numeric(15, 2), default=0)
    amount_usd = db.Column(db.Numeric(15, 2), default=0)
    amount_eur = db.Column(db.Numeric(15, 2), default=0)
    amount_aed = db.Column(db.Numeric(15, 2), default=0)
    amount_gbp = db.Column(db.Numeric(15, 2), default=0)

    rate_usd_try = db.Column(db.Numeric(15, 4), nullable=True)
    rate_eur_try = db.Column(db.Numeric(15, 4), nullable=True)
    rate_aed_try = db.Column(db.Numeric(15, 4), nullable=True) 
    rate_gbp_try = db.Column(db.Numeric(15, 4), nullable=True)
    bank = db.relationship('Bank', back_populates='logs')

    __table_args__ = (
        UniqueConstraint('bank_id', 'date', 'period', name='_bank_date_period_uc'),
    )

    def __repr__(self):
        return f"<BankLog {self.bank.name} - {self.date} - {self.period.name}>"
