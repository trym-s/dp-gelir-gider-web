from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import Bank, BankAccount, DailyBalance, AccountStatusHistory
from app import db

class BankSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Bank
        load_instance = True
        sqla_session = db.session
        include_fk = True

class BankAccountSchema(SQLAlchemyAutoSchema):
    status = fields.Method("get_current_status", dump_only=True)
    iban_number = fields.String(required=True)

    class Meta:
        model = BankAccount
        load_instance = True
        sqla_session = db.session
        include_fk = True
        include_relationships = True # Include relationships for dumping

    bank = fields.Nested(BankSchema, dump_only=True)
    status_history = fields.Nested('AccountStatusHistorySchema', many=True, dump_only=True)

    def get_current_status(self, obj):
        if obj.status_history.first():
            return obj.status_history.first().status
        return "Aktif" # Default status if no history

class DailyBalanceSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = DailyBalance
        load_instance = True
        sqla_session = db.session
        include_fk = True

class AccountStatusHistorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = AccountStatusHistory
        load_instance = True
        sqla_session = db.session
        include_fk = True
