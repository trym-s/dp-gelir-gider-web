# /back/app/bank_logs/schemas.py
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from app import db
from .models import BankLog
from app.banks.schemas import BankAccountSchema # Changed import

class BankLogSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BankLog
        load_instance = True
        sqla_session = db.session
        include_fk = True

    # Nest the full BankAccount object, which includes the Bank info
    bank_account = fields.Nested(BankAccountSchema, dump_only=True)
    date = fields.Date(format='%Y-%m-%d')
    period = fields.String()
    
    amount_try = fields.Decimal(as_string=True)
    amount_usd = fields.Decimal(as_string=True)
    amount_eur = fields.Decimal(as_string=True)
    rate_usd_try = fields.Decimal(as_string=True, allow_none=True)
    rate_eur_try = fields.Decimal(as_string=True, allow_none=True)
