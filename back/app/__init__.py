import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import config_by_name
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    migrate.init_app(app, db)

    from flask_admin import Admin
    from flask_admin.contrib.sqla import ModelView
    # Refactor: Moved models to their respective modules
    from app.region.models import Region
    from app.payment_type.models import PaymentType
    from app.account_name.models import AccountName
    from app.budget_item.models import BudgetItem
    from app.expense.models import ExpenseGroup, Expense
    from app.company.models import Company
    from app.income.models import Income, IncomeReceipt, IncomeGroup
    from app.credit_cards.models import Bank, BankAccount, CreditCard, CreditCardTransaction
    from app.bank_logs.models import BankaLog
    from app.user.models import User

    admin = Admin(app, name='DP-Admin', template_mode='bootstrap4')
    admin.add_view(ModelView(Region, db.session))
    admin.add_view(ModelView(PaymentType, db.session))
    admin.add_view(ModelView(AccountName, db.session))
    admin.add_view(ModelView(BudgetItem, db.session))
    admin.add_view(ModelView(ExpenseGroup, db.session))
    admin.add_view(ModelView(Expense, db.session))
    admin.add_view(ModelView(Company, db.session))
    admin.add_view(ModelView(Income, db.session))
    admin.add_view(ModelView(IncomeReceipt, db.session))
    admin.add_view(ModelView(IncomeGroup, db.session))
    admin.add_view(ModelView(Bank, db.session))
    admin.add_view(ModelView(BankAccount, db.session))
    admin.add_view(ModelView(CreditCard, db.session))
    admin.add_view(ModelView(CreditCardTransaction, db.session))
    admin.add_view(ModelView(BankaLog, db.session))
    admin.add_view(ModelView(User, db.session))


    from app.routes import register_blueprints
    register_blueprints(app)

    from app.errors import register_error_handlers
    register_error_handlers(app)

    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)

    return app