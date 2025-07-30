import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_migrate import Migrate
from config import config_by_name
from flask_cors import CORS

db = SQLAlchemy()
ma = Marshmallow()
migrate = Migrate()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    ma.init_app(app)
    migrate.init_app(app, db)

    from flask_admin import Admin
    from flask_admin.contrib.sqla import ModelView
    # Refactor: Moved models to their respective modules
    from app.region.models import Region
    from app.payment_type.models import PaymentType
    from app.account_name.models import AccountName
    from app.budget_item.models import BudgetItem
    from app.expense.models import ExpenseGroup, Expense
    from app.customer.models import Customer
    from app.income.models import Income, IncomeReceipt, IncomeGroup
    from app.credit_cards.models import CreditCard, CreditCardTransaction
    from app.banks.models import Bank, BankAccount
    from app.bank_logs.models import BankLog
    from app.user.models import User
    from app.loans.models import Loan, LoanType

    admin = Admin(app, name='DP-Admin', template_mode='bootstrap4')
    admin.add_view(ModelView(Region, db.session))
    admin.add_view(ModelView(PaymentType, db.session))
    admin.add_view(ModelView(AccountName, db.session))
    admin.add_view(ModelView(BudgetItem, db.session))
    admin.add_view(ModelView(ExpenseGroup, db.session))
    admin.add_view(ModelView(Expense, db.session))
    admin.add_view(ModelView(Customer, db.session))
    admin.add_view(ModelView(Income, db.session))
    admin.add_view(ModelView(IncomeReceipt, db.session))
    admin.add_view(ModelView(IncomeGroup, db.session))
    admin.add_view(ModelView(Bank, db.session))
    admin.add_view(ModelView(BankAccount, db.session))
    admin.add_view(ModelView(CreditCard, db.session))
    admin.add_view(ModelView(CreditCardTransaction, db.session))
    admin.add_view(ModelView(BankLog, db.session))
    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(Loan, db.session))
    admin.add_view(ModelView(LoanType, db.session))


    from app.routes import register_blueprints
    register_blueprints(app)

    from app.errors import register_error_handlers
    register_error_handlers(app)

    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)

    return app