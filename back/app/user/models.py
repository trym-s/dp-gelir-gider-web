from app import db
from enum import Enum
from datetime import datetime
from sqlalchemy.ext.hybrid import hybrid_property
from werkzeug.security import generate_password_hash, check_password_hash


role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    users = db.relationship('User', backref='role', lazy='dynamic')
    
    permissions = db.relationship(
        'Permission', 
        secondary=role_permissions,
        lazy='subquery', 
        back_populates='roles'
    )
    
    def __repr__(self):
        return f'<Role {self.name}>'
    
class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    # Örn: 'expense:create', 'user:read', 'admin:access'
    name = db.Column(db.String(80), unique=True, nullable=False) 
    # Örn: 'Yeni gider oluşturma yetkisi'
    description = db.Column(db.String(255))

    # --- YENİ İLİŞKİ TANIMI ---
    # İlişkinin diğer tarafını da burada tanımlıyoruz.
    roles = db.relationship(
        'Role', 
        secondary=role_permissions, 
        back_populates='permissions'
    )
    # --- YENİ TANIM SONU ---

    def __repr__(self):
        return f'<Permission {self.name}>'    
    

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # 'role' sütununu 'role_id' foreign key'i ile değiştiriyoruz.
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role.name if self.role else None
        }

    def has_permission(self, permission_name):
        """Kullanıcının belirli bir izne sahip olup olmadığını kontrol eder."""
        if not self.role:
            return False
        return any(p.name == permission_name for p in self.role.permissions)
    