from app import db

class LoanType(db.Model):
    __tablename__ = 'loan_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

    def __repr__(self):
        return f'<LoanType {self.name}>'

class Loan(db.Model):
    __tablename__ = 'loans'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False)
    loan_type_id = db.Column(db.Integer, db.ForeignKey('loan_types.id'), nullable=False)
    
    monthly_interest_rate = db.Column(db.Float, nullable=False)
    annual_interest_rate = db.Column(db.Float, nullable=False)
    
    interest_rules = db.Column(db.Text) # For flexible interest rules
    
    amount_drawn = db.Column(db.Numeric(10, 2), nullable=False)
    date_drawn = db.Column(db.Date, nullable=False)
    
    amount_used = db.Column(db.Numeric(10, 2), default=0.0)
    remaining_principal = db.Column(db.Numeric(10, 2), nullable=False)
    
    term_months = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)

    bank_account = db.relationship('BankAccount', backref=db.backref('loans', lazy=True))
    loan_type = db.relationship('LoanType', backref=db.backref('loans', lazy=True))

    def __repr__(self):
        return f'<Loan {self.name}>'