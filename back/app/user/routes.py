from flask import Blueprint, request, jsonify
from app.user.services import (
    authenticate_user, create, get_all, get_by_id,
    update, delete
)
from app.user.schemas import UserSchema
from app.auth import role_required
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
import logging

user_bp = Blueprint('user_api', __name__, url_prefix='/api/users')

logging.basicConfig(level=logging.INFO)

@user_bp.route("/login", methods=["POST"])
def login():
    logging.info("--- LOGIN ROUTE ---")
    data = request.get_json()
    logging.info(f"Request data: {data}")
    if not data or "username" not in data or "password" not in data:
        logging.warning("Username or password missing from request.")
        return jsonify(message="Username and password required."), 400

    try:
        user = authenticate_user(data["username"], data["password"])
        if not user:
            logging.warning(f"Authentication failed for user: {data['username']}")
            return jsonify(message="Invalid credentials"), 401

        logging.info(f"User {user.username} authenticated successfully.")
        user_permissions = [p.name for p in user.role.permissions]

        # Token'a eklenecek verileri (claims) hazırlayın.
        additional_claims = {
            "role": user.role.id,
            "permissions": user_permissions  # İzin listesini buraya ekleyin
        }

        # Token'ı bu yeni verilerle oluşturun.
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=additional_claims
        )
    
        logging.info(f"Access token created for user: {user.username}")
        return jsonify(access_token=access_token), 200
    except Exception as e:
        logging.error(f"An unexpected error occurred during login: {e}", exc_info=True)
        return jsonify(message="An internal server error occurred."), 500


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
@role_required(1)
def list_users_route():
    users = get_all()
    return jsonify(users), 200

@user_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_route(user_id):
    claims = get_jwt()
    if claims.get('role') != 1 and get_jwt_identity() != user_id:
        return jsonify(message="You are not authorized to view this user."), 403

    user = get_by_id(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(user), 200

@user_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def edit_user_route(user_id):
    claims = get_jwt()
    if claims.get('role') != 1 and get_jwt_identity() != user_id:
        return jsonify(message="You are not authorized to edit this user."), 403

    data = request.get_json()
    try:
        user = update(user_id, data)
        if not user:
            return jsonify(message="User not found"), 404
        return jsonify(user), 200
    except ValueError as e:
        return jsonify(message=str(e)), 409

@user_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required(1)
def remove_user_route(user_id):
    user = delete(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(message="User deleted"), 200

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = get_by_id(user_id)
    if not user:
        return jsonify(message="User not found"), 404
    
    return jsonify(user), 200
