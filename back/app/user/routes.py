from flask import Blueprint, request, jsonify
from app.user.services import (
    authenticate_user, create_user, get_all_users, get_user_by_id,
    update_user, delete_user
)
from app.user.schemas import UserSchema
from app.auth import role_required
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

user_bp = Blueprint('user_api', __name__)

@user_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify(message="Username and password required."), 400

    user = authenticate_user(data["username"], data["password"])
    if not user:
        return jsonify(message="Invalid credentials"), 401

    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    return jsonify(access_token=access_token), 200

@user_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return jsonify(message="Username and password required."), 400
    
    try:
        user = create_user(data)
        schema = UserSchema()
        return jsonify(schema.dump(user)), 201
    except ValueError as e:
        return jsonify(message=str(e)), 409

@user_bp.route("/", methods=["GET"])
@jwt_required()
@role_required(1)  # Admins only
def list_users_route():
    users = get_all_users()
    schema = UserSchema(many=True)
    return jsonify(schema.dump(users)), 200

@user_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_route(user_id):
    claims = get_jwt()
    if claims.get('role') != 1 and get_jwt_identity() != user_id:
        return jsonify(message="You are not authorized to view this user."), 403

    user = get_user_by_id(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    schema = UserSchema()
    return jsonify(schema.dump(user)), 200

@user_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def edit_user_route(user_id):
    claims = get_jwt()
    if claims.get('role') != 1 and get_jwt_identity() != user_id:
        return jsonify(message="You are not authorized to edit this user."), 403

    data = request.get_json()
    try:
        user = update_user(user_id, data)
        if not user:
            return jsonify(message="User not found"), 404
        schema = UserSchema()
        return jsonify(schema.dump(user)), 200
    except ValueError as e:
        return jsonify(message=str(e)), 409

@user_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required(1)  # Admins only
def remove_user_route(user_id):
    user = delete_user(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(message="User deleted"), 200