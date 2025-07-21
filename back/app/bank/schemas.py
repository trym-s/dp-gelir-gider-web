from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Bank, BankLog
from marshmallow import fields

class BankSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Bank
        load_instance = True

class BankLogSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BankLog
        load_instance = True
        include_fk = True
        bank_id = fields.Int(required=True)
    