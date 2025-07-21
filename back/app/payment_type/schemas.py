from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.payment_type.models import PaymentType
from app import db

class PaymentTypeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = PaymentType
        sqla_session = db.session
        load_instance = True
        include_fk = True