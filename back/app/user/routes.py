from flask import Blueprint, request, jsonify
from app.user.services import (
    authenticate_user, create, get_all, get_by_id,
    update, delete
)
from app.user.schemas import UserSchema
from app.auth import permission_required
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User

user_bp = Blueprint('user_api', __name__, url_prefix='/api/users')

@user_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify(message="Username and password required."), 400

    user = authenticate_user(data["username"], data["password"])
    if not user:
        return jsonify(message="Invalid credentials"), 401
    
    permissions = [p.name for p in user.role.permissions] if user.role else []

    additional_claims = {
        "role": user.role.name if user.role else None,
        "permissions": permissions
    }    

    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    return jsonify(access_token=access_token), 200

@user_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify(message="Username and password required."), 400
    
    try:
        user = create(data)
        return jsonify(user), 201
    except ValueError as e:
        return jsonify(message=str(e)), 409

@user_bp.route("/", methods=["GET"])
@jwt_required()
@permission_required('admin:users:read')
def list_users_route():
    users = get_all()
    return jsonify(users), 200

@user_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_route(user_id):
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    permissions = claims.get('permissions', [])

    if current_user_id != user_id and 'admin:users:read' not in permissions:
        return jsonify(message="Bu kullanıcıyı görüntüleme yetkiniz yok."), 403

    user = get_by_id(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(user), 200

@user_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def edit_user_route(user_id):

    current_user_id = get_jwt_identity()
    claims = get_jwt()
    permissions = claims.get('permissions', [])
    is_self = (current_user_id == user_id)
    can_edit_others = 'admin:users:update' in permissions

    

    if not is_self and not can_edit_others:
        return jsonify(message="Bu kullanıcıyı düzenleme yetkiniz yok."), 403

    data = request.get_json()

    if 'role_id' in data and 'admin:roles:update' not in permissions:
        del data['role_id'] # Yetkisi yoksa, rol değiştirme denemesini sessizce yok say

    try:
        user = update(user_id, data)
        if not user:
            return jsonify(message="User not found"), 404
        return jsonify(user), 200
    except ValueError as e:
        return jsonify(message=str(e)), 409

@user_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@permission_required('admin:users:delete')
def remove_user_route(user_id):
    user = delete(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(message="User deleted"), 200

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
@permission_required('user:profile:read')
def get_profile():
    user_id = get_jwt_identity()
    user = get_by_id(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(user), 200
