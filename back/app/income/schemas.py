from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from .. import db
from app.income.models import IncomeStatus, Income, IncomeReceipt, PaymentTimelinessStatus, Currency
from app.customer.models import Customer

class NameOnlySchema(fields.Nested):
    def __init__(self, **kwargs):
        super().__init__({'id': fields.Int(dump_only=True), 'name': fields.Str(dump_only=True)}, **kwargs)

class CustomerNestedSchema(fields.Nested):
    def __init__(self, **kwargs):
        super().__init__({
            'id': fields.Int(dump_only=True), 
            'name': fields.Str(dump_only=True),
            'tax_number': fields.Str(dump_only=True) # YENİ ALAN
        }, **kwargs)

class CustomerSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Customer
        load_instance = True
        sqla_session = db.session
        # YENİ EKLENEN SATIR: tax_number'ın yanıta dahil edilmesini garantiliyoruz.
        fields = ('id', 'name', 'tax_number')
        include_fk = False

class IncomeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Income
        load_instance = True
        include_fk = True
        load_unknown = 'exclude'

    customer = CustomerNestedSchema(dump_only=True)
    region = NameOnlySchema(dump_only=True)
    account_name = NameOnlySchema(dump_only=True)
    budget_item = NameOnlySchema(dump_only=True)
    status = fields.Enum(IncomeStatus, dump_only=True)
    timeliness_status = fields.Enum(PaymentTimelinessStatus, dump_only=True, allow_none=True)
    currency = fields.Enum(Currency, allow_none=True)

    
class IncomeUpdateSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Income
        load_instance = True
        include_fk = True
        load_unknown = 'exclude'

    currency = fields.Enum(Currency, allow_none=True)
 

class IncomeReceiptSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = IncomeReceipt
        load_instance = True