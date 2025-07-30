from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from .models import ActivityLog

class ActivityLogSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ActivityLog
        load_instance = True
