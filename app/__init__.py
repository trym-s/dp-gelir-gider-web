import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import config_by_name


db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    migrate.init_app(app, db)

    from flask_admin import Admin
    from flask_admin.contrib.sqla import ModelView
    from app.models import Region, PaymentType, AccountName, BudgetItem, ExpenseGroup, Expense

    admin = Admin(app, name='DP-Admin', template_mode='bootstrap4')
    admin.add_view(ModelView(Region, db.session))
    admin.add_view(ModelView(PaymentType, db.session))
    admin.add_view(ModelView(AccountName, db.session))
    admin.add_view(ModelView(BudgetItem, db.session))
    admin.add_view(ModelView(ExpenseGroup, db.session))
    admin.add_view(ModelView(Expense, db.session))

    from app.user.models import User
    from app import models

    from app.region.routes import region_bp
    app.register_blueprint(region_bp, url_prefix='/api/regions')

    from app.payment_type.routes import payment_type_bp
    app.register_blueprint(payment_type_bp, url_prefix='/api/payment-types')

    from app.account_name.routes import account_name_bp
    app.register_blueprint(account_name_bp, url_prefix='/api/account-names')

    from app.budget_item.routes import budget_item_bp
    app.register_blueprint(budget_item_bp, url_prefix='/api/budget-items')

    from app.expense.routes import expense_bp
    app.register_blueprint(expense_bp, url_prefix='/api/expenses')

    from app.user.routes import user_bp
    app.register_blueprint(user_bp, url_prefix='/api/users')

    from app.payments.routes import payment_bp
    app.register_blueprint(payment_bp, url_prefix='/api/payments')

    from app.errors import register_error_handlers
    register_error_handlers(app)

    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)

    return app
