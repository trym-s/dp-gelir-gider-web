# app/payment/schemas.py

from marshmallow import Schema, fields, validate

# Sadece 'name' alanını içeren genel bir iç içe şema
class NameOnlySchema(Schema):
    name = fields.Str(dump_only=True)

# Gider şemasını iç içe kullanmak için (ilişkili alanlarla birlikte)
class ExpenseNestedSchema(Schema):
    id = fields.Int(dump_only=True)
    description = fields.Str(dump_only=True)
    # İlişkili modellerden sadece 'name' alanını al
    region = fields.Nested(NameOnlySchema, dump_only=True)
    payment_type = fields.Nested(NameOnlySchema, dump_only=True)
    account_name = fields.Nested(NameOnlySchema, dump_only=True)
    budget_item = fields.Nested(NameOnlySchema, dump_only=True)

class PaymentSchema(Schema):
    """Ödeme verilerini serileştirme ve temel doğrulama için kullanılır."""
    id = fields.Int(dump_only=True)
    expense_id = fields.Int(required=True)
    payment_amount = fields.Decimal(places=2, required=True, validate=validate.Range(min=0.01))
    payment_date = fields.Date(required=True)
    description = fields.Str(required=False, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    
    # İlişkili giderin detaylı bilgisini ekliyoruz
    expense = fields.Nested(ExpenseNestedSchema, dump_only=True)


class PaymentUpdateSchema(Schema):
    """Ödeme güncellerken sadece izin verilen alanları doğrular."""
    payment_amount = fields.Decimal(as_string=True, places=2, required=False, validate=validate.Range(min=0.01))
    payment_date = fields.Date(required=False)
    description = fields.Str(required=False, allow_none=True)

