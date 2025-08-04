from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import Bank, BankAccount, DailyBalance, StatusHistory, KmhLimit, DailyRisk
from app import db

class BankSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Bank
        load_instance = True
        sqla_session = db.session
        include_fk = True

class BankAccountSchema(SQLAlchemyAutoSchema):
    status = fields.Method("get_current_status", dump_only=True)
    iban_number = fields.String(required=False)
    last_morning_balance = fields.Decimal(as_string=True, dump_only=True, places=2)
    last_evening_balance = fields.Decimal(as_string=True, dump_only=True, places=2)
    class Meta:
        model = BankAccount
        load_instance = True
        sqla_session = db.session
        include_fk = True
        include_relationships = True # Include relationships for dumping

    bank = fields.Nested(BankSchema, dump_only=True)
    

    def get_current_status(self, obj):
        latest_status_entry = obj.status_history.first() 
        if latest_status_entry:
            return latest_status_entry.status
        return "Aktif" # Varsayılan durumu döndür

class KmhLimitSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = KmhLimit
        load_instance = True
        sqla_session = db.session
        include_fk = True

class DailyRiskSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = DailyRisk
        load_instance = True
        sqla_session = db.session
        include_fk = True

class DailyBalanceSchema(SQLAlchemyAutoSchema):
    # --- BU İKİ SATIRI EKLEYİN (veya mevcutsa doğru olduğundan emin olun) ---
    bank_name = fields.String(attribute="account.bank.name", dump_only=True)
    account_name = fields.String(attribute="account.name", dump_only=True)
    
    class Meta:
        model = DailyBalance
        load_instance = True
        sqla_session = db.session
        include_fk = True

class StatusHistorySchema(SQLAlchemyAutoSchema):
    class Meta:
        # Modelin de yeni ve doğru olan 'StatusHistory' sınıfını göstermesini sağlıyoruz.
        model = StatusHistory
        load_instance = True
        sqla_session = db.session
        include_fk = True
        # Bu satır, yeni ilişki tanımımız (backref) sayesinde artık gereksiz.
        # İsterseniz silebilirsiniz, kalması bir soruna yol açmaz.
        exclude = ('bank_account',)