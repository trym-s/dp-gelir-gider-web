from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.customer.models import Customer
from app import db

class CustomerSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Customer
        sqla_session = db.session
        load_instance = True
        include_fk = True
        load_unknown = 'exclude'