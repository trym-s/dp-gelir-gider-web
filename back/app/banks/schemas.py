from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import Bank, BankAccount, DailyBalance, BankAccountStatusHistory, KmhLimit, DailyRisk
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
    class Meta:
        model = DailyBalance
        load_instance = True
        sqla_session = db.session
        include_fk = True

class BankAccountStatusHistorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BankAccountStatusHistory
        load_instance = True
        sqla_session = db.session
        include_fk = True
        exclude = ('bank_account',)