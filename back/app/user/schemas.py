from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.user.models import User, Role, Permission
from marshmallow import Schema, fields

# SQLAlchemyAutoSchema yerine standart Schema kullanıyoruz.
# Bu, olası tüm otomatik davranış çakışmalarını ortadan kaldırır.

class PermissionSchema(Schema):
    # İhtiyacımız olan alanları manuel olarak tanımlıyoruz.
    name = fields.Str()
    description = fields.Str()

class RoleSchema(Schema):
    name = fields.Str()
    # Bu metot, lazy='dynamic' ile uyumlu çalışmak için doğru yöntemdi.
    # Aynen koruyoruz.
    permissions = fields.Method("get_permissions_list")

    def get_permissions_list(self, obj):
        if obj.role:
            # SQLAlchemy ilişkileri sayesinde role_obj'yi tekrar sorgulamaya gerek yok.
            # obj.role zaten Role nesnesidir.
            role_obj = obj.role
            if role_obj.permissions:
                # .all() METODUNU KALDIRIN
                # role_obj.permissions zaten izinlerin listesidir.
                return [p.name for p in role_obj.permissions]
        return []
class UserSchema(Schema):
    # Kullanıcı için ihtiyacımız olan alanları da manuel olarak belirtiyoruz.
    id = fields.Int()
    username = fields.Str()
    # 'role' bir nesne olduğu için Nested field kullanmaya devam ediyoruz.
    role = fields.Nested(RoleSchema)