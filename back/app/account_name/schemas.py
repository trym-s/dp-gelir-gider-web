from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.account_name.models import AccountName
from app import db

class AccountNameSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = AccountName
        sqla_session = db.session
        load_instance = True
        include_fk= True