from marshmallow import Schema, fields

class PaymentTypeSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    region_id = fields.Int(required=True)

    class Meta:
        load_instance = True
