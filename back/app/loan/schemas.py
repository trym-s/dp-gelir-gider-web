from marshmallow import Schema, fields


class LoanTypeSchema(Schema):
    id = fields.Int()
    name = fields.Str()


from marshmallow import Schema, fields

class LoanSchema(Schema):
    id = fields.Int()
    bank_id = fields.Int()
    loan_type_id = fields.Int()
    bank = fields.Method("get_bank_name")
    loanType = fields.Method("get_loan_type_name")

    description = fields.Str()
    principal_amount = fields.Float()
    monthly_rate = fields.Float()
    yearly_rate = fields.Float()
    issue_date = fields.Date()
    due_date = fields.Date()
    installment_count = fields.Int()
    total_debt = fields.Float()
    total_paid = fields.Float()

    def get_bank_name(self, obj):
        return obj.bank.name if obj.bank else None

    def get_loan_type_name(self, obj):
        return obj.loan_type.name if obj.loan_type else None
