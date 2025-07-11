from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Region

from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Region

class RegionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Region
        include_fk = True
