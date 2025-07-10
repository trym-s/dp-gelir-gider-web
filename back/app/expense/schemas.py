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

    # Yükleme (veri alma) için ID'leri burada tanımlıyoruz
    group_id = fields.Int(load_only=True, required=False, allow_none=True)
    region_id = fields.Int(load_only=True, required=True)
    payment_type_id = fields.Int(load_only=True, required=True)
    account_name_id = fields.Int(load_only=True, required=True)
    budget_item_id = fields.Int(load_only=True, required=True)

    class Meta:
        model = Expense
        load_instance = True
        include_fk = True
        # Artık exclude kullanmıyoruz, çünkü alanları load_only/dump_only ile yönetiyoruz
