from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields, Schema
from app.income.models import Income, IncomeGroup, IncomeReceipt

class IncomeReceiptSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = IncomeReceipt
        load_instance = True
        include_fk = True

class IncomeGroupSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = IncomeGroup
        load_instance = True
        fields = ("id", "name", "created_at")

# İlişkili nesnelerden ID ve 'name' alanını almak için bir şema
class IdAndNameSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)

class IncomeSchema(SQLAlchemyAutoSchema):
    # İlişkili nesneleri 'Nested' olarak tanımlıyoruz
    group = fields.Nested(IncomeGroupSchema, dump_only=True, allow_none=True)
    region = fields.Nested(IdAndNameSchema, dump_only=True)
    company = fields.Nested(IdAndNameSchema, dump_only=True)
    account_name = fields.Nested(IdAndNameSchema, dump_only=True)
    budget_item = fields.Nested(IdAndNameSchema, dump_only=True)
    remaining_amount = fields.Float(dump_only=True)

    # Yükleme (veri alma) için ID'leri burada tanımlıyoruz
    group_id = fields.Int(load_only=True, required=False, allow_none=True)
    region_id = fields.Int(load_only=True, required=True)
    company_id = fields.Int(load_only=True, required=True)
    account_name_id = fields.Int(load_only=True, required=True)
    budget_item_id = fields.Int(load_only=True, required=True)

    class Meta:
        model = Income
        load_instance = True
        include_fk = True
