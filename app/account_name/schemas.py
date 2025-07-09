from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import AccountName

class AccountNameSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = AccountName
        load_instance = True
        include_fk = True
