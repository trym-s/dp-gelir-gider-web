from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Bank, BankLog
from marshmallow import fields

class BankSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Bank
        load_instance = True
    
    # Sadece bu iki alanı kullanacağımızı açıkça belirtelim.
    id = fields.Int(dump_only=True)
    name = fields.Str()

class BankLogSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BankLog
        load_instance = True
        include_fk = True
        bank_id = fields.Int(required=True)
    