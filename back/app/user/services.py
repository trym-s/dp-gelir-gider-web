from app import db
from app.user.models import User
from app.auth import hash_password, check_password

def authenticate_user(username, password):
    """
    Authenticates a user by username and password.
    Returns the user object if authentication is successful, otherwise None.
    """
    user = User.query.filter_by(username=username).first()
    if user and check_password(user.password_hash, password):
        return user
    return None

def create_user(data):
    """
    Creates a new user.
    """
    if User.query.filter_by(username=data["username"]).first():
        raise ValueError("Username already exists.")

    user = User(
        username=data["username"],
        password_hash=hash_password(data["password"]),
        role=data.get("role", 3)
    )
    db.session.add(user)
    db.session.commit()
    return user

def get_all_users():
    return User.query.all()

def get_user_by_id(user_id):
    return User.query.get(user_id)

def update_user(user_id, data):
    user = User.query.get(user_id)
    if not user:
        return None
    
    if "username" in data:
        # Ensure new username doesn't already exist
        if User.query.filter(User.id != user_id, User.username == data["username"]).first():
            raise ValueError("Username already taken.")
        user.username = data["username"]
        
    if "password" in data:
        user.password_hash = hash_password(data["password"])
        
    if "role" in data:
        user.role = data["role"]
        
    db.session.commit()
    return user

def delete_user(user_id):
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
    return user