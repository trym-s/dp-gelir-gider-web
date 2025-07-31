# back/app/account_name/models.py
from app import db

class AccountName(db.Model):
    __tablename__ = 'account_name'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"<AccountName {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }
