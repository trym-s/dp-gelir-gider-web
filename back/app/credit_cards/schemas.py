from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import Bank, BankAccount, CreditCard, CreditCardTransaction, CardBrand
from app import db

class CardBrandSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CardBrand
        load_instance = True
        sqla_session = db.session

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
