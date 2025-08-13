from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields, Schema
from app.expense.models import Expense, ExpenseGroup, ExpenseLine
from app.account_name.schemas import AccountNameSchema

class ExpenseGroupSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ExpenseGroup
        load_instance = True
        fields = ("id", "name", "created_at")

# İlişkili nesnelerden ID ve 'name' alanını almak için bir şema
class IdAndNameSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)

class ExpenseLineSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ExpenseLine
        load_instance = True
        include_fk = True
        fields = (
            "id",
            "expense_id",
            "item_name",
            "quantity",
            "unit_price",
            "discount",
            "kdv_amount",
            "tevkifat_amount",
            "otv_amount",
            "oiv_amount",
            "net_amount_try",
        )

class ExpenseSchema(SQLAlchemyAutoSchema):
    # İlişkili nesneleri 'Nested' olarak tanımlıyoruz
    group = fields.Nested(ExpenseGroupSchema, dump_only=True, allow_none=True)
    region = fields.Nested(IdAndNameSchema, dump_only=True)
    payment_type = fields.Nested(IdAndNameSchema, dump_only=True)
    account_name = fields.Nested(IdAndNameSchema, dump_only=True)
    budget_item = fields.Nested(IdAndNameSchema, dump_only=True)
    account_name = fields.Nested(AccountNameSchema, dump_only=True)
    supplier = fields.Nested(IdAndNameSchema, dump_only=True, allow_none=True) # Add this line
    lines = fields.List(fields.Nested(ExpenseLineSchema), dump_only=True) # Add this line
    
    # Yükleme (veri alma) için ID'leri burada tanımlıyoruz
    group_id = fields.Int(load_only=True, required=False, allow_none=True)
    region_id = fields.Int(load_only=True, required=True)
    payment_type_id = fields.Int(load_only=True, required=True)
    account_name_id = fields.Int(load_only=True, required=True)
    budget_item_id = fields.Int(load_only=True, required=True)
    supplier_id = fields.Int(load_only=True, required=False, allow_none=True) # Add this line
    completed_at = fields.Date(dump_only=True)

    class Meta:
        model = Expense
        load_instance = True
        include_fk = True
        include_relationships = True
        # Artık exclude kullanmıyoruz, çünkü alanları load_only/dump_only ile yönetiyoruz