from flask import Blueprint, jsonify, request
from app.models import db, Role, Permission
from app.auth import permission_required
from flask_jwt_extended import jwt_required

admin_bp = Blueprint('admin_api', __name__, url_prefix='/api/admin')

@admin_bp.route("/roles", methods=['GET'])
# --- DOĞRU SIRA ---
@jwt_required()
@permission_required('admin:roles:read')
def get_roles():
    roles = Role.query.filter(Role.name != 'Admin').all()
    return jsonify([{'id': r.id, 'name': r.name} for r in roles])

@admin_bp.route("/permissions", methods=['GET'])
# --- DOĞRU SIRA ---
@jwt_required()
@permission_required('admin:permissions:read')
def get_permissions():
    permissions = Permission.query.all()
    grouped_permissions = {}
    for p in permissions:
        # İzinleri modüllerine göre gruplayarak göndermek frontend'de işimizi kolaylaştırır
        # Örn: 'expense:create' -> 'expense' grubuna eklenir
        group = p.name.split(':')[0]
        if group not in grouped_permissions:
            grouped_permissions[group] = []
        grouped_permissions[group].append({'id': p.id, 'name': p.name, 'description': p.description})
    
    return jsonify(grouped_permissions)


@admin_bp.route("/roles/<int:role_id>/permissions", methods=['GET'])
# --- DOĞRU SIRA ---
@jwt_required()
@permission_required('admin:roles:read')
def get_role_permissions(role_id):
    role = Role.query.get_or_404(role_id)
    return jsonify([p.id for p in role.permissions])

@admin_bp.route("/roles/<int:role_id>/permissions", methods=['PUT'])
# --- DOĞRU SIRA ---
@jwt_required()
@permission_required('admin:roles:update')
def update_role_permissions(role_id):
    role = Role.query.get_or_404(role_id)
    data = request.get_json()
    permission_ids = data.get('permission_ids', [])

    new_permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()
    
    role.permissions = new_permissions
    db.session.commit()
    
    return jsonify({"message": f"'{role.name}' rolünün yetkileri güncellendi."})