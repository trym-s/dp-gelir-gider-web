from app.region.routes import region_bp
from app.payment_type.routes import payment_type_bp
from app.account_name.routes import account_name_bp
from app.budget_item.routes import budget_item_bp
from app.expense.routes import expense_bp, expense_group_bp
from app.user.routes import user_bp
from app.payments.routes import payment_bp
from app.summary.routes import summary_bp
from app.income.routes import income_bp, income_group_bp
from app.company.routes import company_bp
from app.credit_cards.routes import credit_cards_bp
from app.bank_logs.routes import bank_logs_bp
# from app.exchange_rates.routes import exchange_rates_bp

def register_blueprints(app):
    """Registers all blueprints for the application."""
    app.register_blueprint(region_bp)
    app.register_blueprint(payment_type_bp)
    app.register_blueprint(account_name_bp)
    app.register_blueprint(budget_item_bp)
    app.register_blueprint(expense_bp)
    app.register_blueprint(expense_group_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(summary_bp)
    app.register_blueprint(income_bp)
    app.register_blueprint(income_group_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(credit_cards_bp)
    app.register_blueprint(bank_logs_bp)
    # app.register_blueprint(exchange_rates_bp)

