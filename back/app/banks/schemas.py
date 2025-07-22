from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import Bank, BankAccount
from app import db

class BankSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Bank
        load_instance = True
        sqla_session = db.session
        include_fk = True

class BankAccountSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BankAccount
        load_instance = True
        sqla_session = db.session
        include_fk = True
    
    bank = fields.Nested(BankSchema)
