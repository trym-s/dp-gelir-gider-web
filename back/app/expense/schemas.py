from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields, Schema
from app.models import Expense, ExpenseGroup

class ExpenseGroupSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ExpenseGroup
        load_instance = True
        fields = ("id", "name", "created_at")

# İlişkili nesnelerden sadece 'name' alanını almak için basit bir şema
# Bu, API yanıtını daha hafif ve temiz tutar.
class NameOnlySchema(Schema):
    name = fields.Str(dump_only=True)

class ExpenseSchema(SQLAlchemyAutoSchema):
    # İlişkili nesneleri 'Nested' olarak tanımlıyoruz
    group = fields.Nested(ExpenseGroupSchema, dump_only=True, allow_none=True)
    region = fields.Nested(NameOnlySchema, dump_only=True)
    payment_type = fields.Nested(NameOnlySchema, dump_only=True)
    account_name = fields.Nested(NameOnlySchema, dump_only=True)
    budget_item = fields.Nested(NameOnlySchema, dump_only=True)

    class Meta:
        model = Expense
        load_instance = True
        include_fk = True
        # Tam nesneleri gönderdiğimiz için ID'leri yanıttan çıkarabiliriz
        exclude = ("group_id", "region_id", "payment_type_id", "account_name_id", "budget_item_id")
