from . import db
from datetime import datetime

class Region(db.Model):
    __tablename__ = 'region'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    payment_types = db.relationship('PaymentType', backref='region', lazy=True)

    def __repr__(self):
        return f"<Region {self.name}>"

class PaymentType(db.Model):
    __tablename__ = 'payment_type'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)

    account_names = db.relationship('AccountName', backref='payment_type', lazy=True)

    def __repr__(self):
        return f"<PaymentType {self.name}>"

class AccountName(db.Model):
    __tablename__ = 'account_name'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    payment_type_id = db.Column(db.Integer, db.ForeignKey('payment_type.id'), nullable=False)

    budget_items = db.relationship('BudgetItem', backref='account_name', lazy=True)

    def __repr__(self):
        return f"<AccountName {self.name}>"

class BudgetItem(db.Model):
    __tablename__ = 'budget_item'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'), nullable=False)

    def __repr__(self):
        return f"<BudgetItem {self.name}>"

class ExpenseGroup(db.Model):
    __tablename__ = 'expense_group'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expenses = db.relationship('Expense', backref='group', lazy=True)

    def __repr__(self):
        return f"<ExpenseGroup {self.name}>"

class Expense(db.Model):
    __tablename__ = 'expense'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('expense_group.id'))
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'))
    payment_type_id = db.Column(db.Integer, db.ForeignKey('payment_type.id'))
    account_name_id = db.Column(db.Integer, db.ForeignKey('account_name.id'))
    budget_item_id = db.Column(db.Integer, db.ForeignKey('budget_item.id'))
    remaining_amount = db.Column(db.Numeric(10,2), default=0)
    description = db.Column(db.String(255))
    date = db.Column(db.DateTime)
    amount = db.Column(db.Numeric(10,2))
    status = db.Column(db.Integer, default=0) # Enum implementation below if needed

    def __repr__(self):
        return f"<Expense {self.description} - {self.amount}>"
