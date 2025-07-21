# /back/app/bank_logs/models.py
import enum
from app import db
from sqlalchemy import UniqueConstraint

class Period(enum.Enum):
    morning = "morning"
    evening = "evening"

class BankaLog(db.Model):
    __tablename__ = 'banka_log'
    id = db.Column(db.Integer, primary_key=True)
    bank_id = db.Column(db.Integer, db.ForeignKey('bank.id'), nullable=False)
    tarih = db.Column(db.Date, nullable=False)
    period = db.Column(db.Enum(Period), nullable=False)
    
    miktar_try = db.Column(db.Numeric(15, 2), default=0)
    miktar_usd = db.Column(db.Numeric(15, 2), default=0)
    miktar_eur = db.Column(db.Numeric(15, 2), default=0)

    # İşlem anındaki kurları saklamak için
    kur_usd_try = db.Column(db.Numeric(15, 4), nullable=True)
    kur_eur_try = db.Column(db.Numeric(15, 4), nullable=True)

    bank = db.relationship('Bank', backref=db.backref('logs', lazy='dynamic'))

    __table_args__ = (
        UniqueConstraint('bank_id', 'tarih', 'period', name='_bank_tarih_period_uc'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "bank_id": self.bank_id,
            "tarih": self.tarih.isoformat(),
            "period": self.period.name,
            "try": float(self.miktar_try),
            "usd": float(self.miktar_usd),
            "eur": float(self.miktar_eur),
            "kur_usd_try": float(self.kur_usd_try) if self.kur_usd_try else None,
            "kur_eur_try": float(self.kur_eur_try) if self.kur_eur_try else None,
            # Banka bilgilerini de ekleyelim ki ön yüzde kolayca kullanılsın
            "name": self.bank.name,
            "logo": None # Henüz logo alanı yok, ileride eklenebilir
        }

    def __repr__(self):
        return f"<BankaLog {self.bank.name} - {self.tarih} - {self.period.name}>"
