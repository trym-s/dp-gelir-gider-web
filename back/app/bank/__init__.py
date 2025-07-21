# app/__init__.py

from flask import Flask
from app import db
from app.bank.routes import bank_bp  # Blueprint'in doğru import edilmesi

def create_app():
    app = Flask(__name__)

    # Blueprint'leri kaydetme
    app.register_blueprint(bank_bp)

    # Veritabanı ve diğer başlangıçlar
    db.init_app(app)

    return app
