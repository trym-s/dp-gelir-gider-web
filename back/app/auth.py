from functools import wraps
from flask import jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import get_jwt

def hash_password(password):
    """Hashes a password."""
    return generate_password_hash(password)

def check_password(password_hash, password):
    """Checks if a password matches the hash."""
    return check_password_hash(password_hash, password)

def permission_required(permission):
    """
    Kullanıcının JWT token'ındaki izinler listesinde,
    istenen iznin olup olmadığını kontrol eden decorator.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            permissions_in_token = [p.strip() for p in claims.get('permissions', [])]
            required_permission = permission.strip()
            if required_permission not in permissions_in_token:
                return jsonify(message="Bu işlemi yapmak için yetkiniz yok."), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def role_required(required_role):
    """
    Decorator to ensure a user has the required role.
    Role hierarchy: 1 (admin) > 2 (editor) > 3 (viewer)
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role')
            if user_role is None or user_role > required_role:
                return jsonify(message="You are not authorized to perform this action."), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
