# app/payment/schemas.py

from marshmallow import Schema, fields, validate

class PaymentSchema(Schema):
    """Ödeme verilerini serileştirme ve temel doğrulama için kullanılır."""
    id = fields.Int(dump_only=True) # Sadece cevap dönerken gösterilir
    expense_id = fields.Int(required=True)
    payment_amount = fields.Decimal(as_string=True, places=2, required=True, validate=validate.Range(min=0.01))
    payment_date = fields.Date(required=True)
    notes = fields.Str(required=False, allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class PaymentUpdateSchema(Schema):
    """Ödeme güncellerken sadece izin verilen alanları doğrular."""
    payment_amount = fields.Decimal(as_string=True, places=2, required=False, validate=validate.Range(min=0.01))
    payment_date = fields.Date(required=False)
    notes = fields.Str(required=False, allow_none=True)