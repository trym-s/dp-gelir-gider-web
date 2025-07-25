from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from .. import db
from ..models import IncomeStatus, Customer, Income, IncomeReceipt

class NameOnlySchema(fields.Nested):
    def __init__(self, **kwargs):
        super().__init__({'id': fields.Int(dump_only=True), 'name': fields.Str(dump_only=True)}, **kwargs)


class CustomerSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Customer
        load_instance = True
        sqla_session = db.session

class IncomeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Income
        load_instance = True
        include_fk = True
        load_unknown = 'exclude'

    customer = NameOnlySchema(dump_only=True)
    region = NameOnlySchema(dump_only=True)
    account_name = NameOnlySchema(dump_only=True)
    budget_item = NameOnlySchema(dump_only=True)
    status = fields.Enum(IncomeStatus, by_value=True, dump_only=True)

class IncomeUpdateSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Income
        load_instance = True
        include_fk = True
        load_unknown = 'exclude'

class IncomeReceiptSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = IncomeReceipt
        load_instance = True