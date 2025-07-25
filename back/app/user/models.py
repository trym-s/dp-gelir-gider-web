from app import db
from werkzeug.security import generate_password_hash, check_password_hash


#class User(db.Model):
#    __tablename__ = 'user'
#    id = db.Column(db.Integer, primary_key=True)
#    username = db.Column(db.String(100), unique=True, nullable=False)
#    password_hash = db.Column(db.String(255), nullable=False)
#    role = db.Column(db.Integer, nullable=False, default=3)  # 1: admin, 2: editor, 3: viewer
#
#    def __repr__(self):
#        return f"<User {self.username}, role {self.role}>"
#
#    def to_dict(self):
#        return {
#            'id': self.id,
#            'username': self.username,
#            'role': self.role
#        }