from marshmallow import Schema, fields


class LoanTypeSchema(Schema):
    id = fields.Int()
    name = fields.Str()


class LoanSchema(Schema):
    id = fields.Int()
    bank_id = fields.Int(required=True)
    loan_type_id = fields.Int(required=True)
    description = fields.Str()
    principal_amount = fields.Float(required=True)
    monthly_rate = fields.Float(required=True)
    yearly_rate = fields.Float(required=True)
    issue_date = fields.Date(required=True)
    due_date = fields.Date(required=True)
    installment_count = fields.Int(required=True)
    total_debt = fields.Float(required=True)
    total_paid = fields.Float()
