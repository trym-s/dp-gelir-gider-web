# back/app/payment_type/models.py
from app import db

class PaymentType(db.Model):
    __tablename__ = 'payment_type'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=True)
    account_names = db.relationship('AccountName', backref='payment_type', lazy=True)
    def __repr__(self):
        return f"<PaymentType {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'region_id': self.region_id
        }
