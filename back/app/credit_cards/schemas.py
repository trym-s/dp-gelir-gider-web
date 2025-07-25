from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import CreditCard, CreditCardTransaction, CardBrand
from app.banks.schemas import BankAccountSchema
from app import db

class CardBrandSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CardBrand
        load_instance = True
        sqla_session = db.session

class CreditCardTransactionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CreditCardTransaction
        load_instance = True
        sqla_session = db.session
        include_fk = True

class CreditCardSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CreditCard
        load_instance = True
        sqla_session = db.session
        include_fk = True

    bank_account = fields.Nested(BankAccountSchema)
    transactions = fields.Nested(CreditCardTransactionSchema, many=True)
    card_brand = fields.Nested(CardBrandSchema)
    current_debt = fields.Decimal(as_string=True, dump_only=True)
    available_limit = fields.Decimal(as_string=True, dump_only=True)
    credit_card_no = fields.String()
    cvc = fields.Integer()
    expiration_date = fields.String()
