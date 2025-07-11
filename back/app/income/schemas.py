from marshmallow import Schema, fields, validate

class CompanySchema(Schema):
    """Şirket/Müşteri verilerini serileştirme ve doğrulama için kullanılır."""
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120))

class IncomeSchema(Schema):
    id = fields.Int(dump_only=True)
    description = fields.Str(required=True, validate=validate.Length(min=3))
    total_amount = fields.Decimal(as_string=True, places=2, required=True, validate=validate.Range(min=0.01))
    received_amount = fields.Decimal(as_string=True, places=2, dump_only=True)
    status = fields.Str(dump_only=True)
    date = fields.Date(required=True)
    created_at = fields.DateTime(dump_only=True)
    region_id = fields.Int(required=True)
    account_name_id = fields.Int(required=True)
    budget_item_id = fields.Int(required=True)
    company_id = fields.Int(required=True)

class IncomeUpdateSchema(Schema):
    description = fields.Str(required=False)
    total_amount = fields.Decimal(as_string=True, places=2, required=False, validate=validate.Range(min=0.01))
    date = fields.Date(required=False)
    region_id = fields.Int(required=False)
    account_name_id = fields.Int(required=False)
    budget_item_id = fields.Int(required=False)
    company_id = fields.Int(required=False)


class IncomeReceiptSchema(Schema):
    id = fields.Int(dump_only=True)
    income_id = fields.Int(required=True, load_only=True)
    receipt_amount = fields.Decimal(as_string=True, places=2, required=True, validate=validate.Range(min=0.01))
    receipt_date = fields.Date(required=True)
    notes = fields.Str(required=False, allow_none=True)
    created_at = fields.DateTime(dump_only=True)