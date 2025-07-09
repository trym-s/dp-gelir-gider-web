from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import PaymentType

class PaymentTypeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = PaymentType
        load_instance = True
        include_fk = True