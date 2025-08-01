from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.account_name.models import AccountName
from app import db
from marshmallow import fields
class AccountNameSchema(SQLAlchemyAutoSchema):
    payment_day = fields.Str(allow_none=True)
    class Meta:
        model = AccountName
        sqla_session = db.session
        load_instance = True
        include_fk = True