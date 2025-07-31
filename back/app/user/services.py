from app import db
from app.user.models import User
from app.auth import hash_password, check_password
import logging

logging.basicConfig(level=logging.INFO)

def authenticate_user(username, password):
    """
    Authenticates a user by username and password.
    Returns the user object if authentication is successful, otherwise None.
    """
    logging.info(f"--- AUTHENTICATE USER SERVICE ---")
    logging.info(f"Attempting to authenticate user: {username}")
    
    user = User.query.filter_by(username=username).first()
    if not user:
        logging.warning(f"User '{username}' not found in database.")
        return None

    logging.info(f"User '{username}' found. Checking password.")
    if not check_password(user.password_hash, password):
        logging.warning(f"Password check failed for user: {username}")
        return None
        
    logging.info(f"Password check successful for user: {username}")
    return user


def create(data):
    if User.query.filter_by(username=data['username']).first():
        return None, 'User already exists'
    
    try:
        logging.info(f"Attempting to create user with data: {data}")
        user = User(
            username=data["username"], 
            password_hash=hash_password(data["password"]), 
            role_id=data.get("role", 3)
        )
        db.session.add(user)
        db.session.commit()
        logging.info(f"User {user.username} created successfully with role_id: {user.role_id}")
        
        # Assuming UserSchema is defined elsewhere and correctly handles serialization
        from app.user.schemas import UserSchema
        user_schema = UserSchema()
        return user_schema.dump(user), None
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating user: {e}", exc_info=True)
        return None, f"Internal server error during user creation: {e}"


def get_all():
    users = User.query.all()
    return [user.to_dict() for user in users]

def get_by_id(user_id):
    user = User.query.get(user_id)
    return user.to_dict() if user else None

def update(user_id, data):
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
    return user.to_dict()

def delete(user_id):
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
    return user
