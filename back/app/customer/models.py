from app import db


class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    tax_number = db.Column(db.String(11), unique=True, nullable=True) 
    incomes = db.relationship('Income', back_populates='customer', lazy=True)
    
    
    def __repr__(self):
        return f'<Customer {self.name}>'