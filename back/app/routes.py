from app.region.routes import region_bp
from app.payment_type.routes import payment_type_bp
from app.account_name.routes import account_name_bp
from app.budget_item.routes import budget_item_bp
from app.expense.routes import expense_bp, expense_group_bp
from app.user.routes import user_bp
from app.payments.routes import payment_bp
from app.summary.routes import summary_bp
from app.income.routes import income_bp
from app.customer.routes import customer_bp
from app.credit_cards.routes import credit_cards_bp
from app.bank_logs.routes import bank_logs_bp
from app.banks.routes import banks_bp, bank_status_bp, kmh_bp
from app.loans.routes import loans_bp
from app.dashboard.routes import dashboard_bp
from app.importers.credit_card.routes import credit_card_importer_bp
from app.activity_log.routes import activity_log_bp
from app.admin.routes import admin_bp
from app.income_transaction_pdf.routes import income_pdf_bp
from app.expense_transaction_pdf.routes import pdf_bp
from app.exchange_rates.routes import exchange_rates_bp
from app.importers.expense.routes import expense_importer_bp
from app.expense.supplier_routes import supplier_bp
from app.transactions.routes import transactions_bp
from app.reminders.routes import reminders_bp


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
    app.register_blueprint(pdf_bp)
    
    app.register_blueprint(customer_bp)
    app.register_blueprint(credit_cards_bp)
    app.register_blueprint(bank_logs_bp)
    app.register_blueprint(banks_bp)
    app.register_blueprint(bank_status_bp)
    app.register_blueprint(kmh_bp) # Register the new KMH blueprint
    app.register_blueprint(loans_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(credit_card_importer_bp)
    app.register_blueprint(activity_log_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(income_pdf_bp)
    app.register_blueprint(exchange_rates_bp)
    app.register_blueprint(expense_importer_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(supplier_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(reminders_bp)
