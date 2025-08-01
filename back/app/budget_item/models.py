# back/app/budget_item/models.py
from app import db

class BudgetItem(db.Model):
    __tablename__ = 'budget_item'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'), nullable=False)


    def __repr__(self):
        return f"<BudgetItem {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'account_name_id': self.account_name_id
        }
