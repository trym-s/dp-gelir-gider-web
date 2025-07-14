from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import AccountName

class AccountNameSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = AccountName
        include_fk = True
        include_fk = True
