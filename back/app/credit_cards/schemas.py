from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import Schema, fields, post_dump
from .models import CreditCard, CreditCardTransaction, CardBrand, DailyCreditCardLimit
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
    total_payments = fields.Decimal(as_string=True, dump_only=True)
    limit = fields.Decimal(as_string=True) # Add this line
    credit_card_no = fields.String()
    cvc = fields.Integer()
    expiration_date = fields.String()
    status = fields.Str(dump_only=True, allow_none=True)
    status_start_date = fields.Date(dump_only=True, allow_none=True)


class GroupedCreditCardsByBankSchema(Schema):
    class Meta:
        ordered = True

    @post_dump
    def group_cards(self, data, **kwargs):
        # This method will be called after serialization
        # It expects 'data' to be a dictionary where keys are bank names
        # and values are lists of CreditCard objects (already serialized by CreditCardSchema)
        return data

    # Dynamically add fields for each bank, assuming bank names are known at runtime
    # This approach requires the bank names to be passed to the schema during initialization
    # For simplicity, we'll assume the service returns a dict that can be directly serialized
    # with CreditCardSchema for its values.
    # A more robust solution might involve a custom field or a different serialization strategy
    # if the bank names are truly dynamic and not known beforehand.
    # For now, we'll rely on the service to return a structure that can be directly mapped.
    # The actual fields will be added dynamically when the schema is instantiated.
    # Example: bank_name = fields.List(fields.Nested(CreditCardSchema))


class DailyCreditCardLimitSchema(SQLAlchemyAutoSchema):
    """Günlük Kredi Kartı Limiti verileri için şema."""
    class Meta:
        model = DailyCreditCardLimit
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    entry_date = fields.Date(format="%Y-%m-%d", required=True)
    morning_limit = fields.Decimal(as_string=True, allow_none=True)
    evening_limit = fields.Decimal(as_string=True, allow_none=True)

    # Pivot tabloda göstermek için
    credit_card_name = fields.String(attribute="credit_card.name", dump_only=True)
