# back/app/exchange_rates/models.py
from app import db

class ExchangeRate(db.Model):
    __tablename__ = 'exchange_rates'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    usd_try = db.Column(db.Numeric(15, 4), nullable=False)
    eur_try = db.Column(db.Numeric(15, 4), nullable=False)
    gbp_try = db.Column(db.Numeric(15, 4), nullable=False)
    aud_try = db.Column(db.Numeric(15, 4), nullable=False)

    def __repr__(self):
        return f"<ExchangeRate {self.date} - USD: {self.usd_try}, EUR: {self.eur_try}>"
