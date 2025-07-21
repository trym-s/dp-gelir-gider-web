from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.region.models import Region
from app import db

class RegionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Region
        sqla_session = db.session
        load_instance = True
        include_fk = True