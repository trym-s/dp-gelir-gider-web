from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Region

class RegionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Region
        load_instance = True
