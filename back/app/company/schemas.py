from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Company
from app import db

class CompanySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Company
        sqla_session = db.session
        load_instance = True
        include_fk = True
