from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.user.models import User

class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash",)  #password hash'i API response'ta gösterme
