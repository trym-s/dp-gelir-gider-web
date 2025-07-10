from flask import Blueprint, request, jsonify
from app.region.services import get_all, create, update, delete
from app.region.schemas import RegionSchema

region_bp = Blueprint('region_api', __name__, url_prefix='/api/regions')

@region_bp.route("/", methods=["GET"], strict_slashes=False)
def list_regions():
    regions = get_all()
    schema = RegionSchema(many=True)
    return jsonify(schema.dump(regions)), 200

@region_bp.route("/", methods=["POST"])
def add_region():
    data = request.get_json()
    schema = RegionSchema()
    validated_data = schema.load(data)
    region = create(validated_data)
    return jsonify(region), 201

@region_bp.route("/<int:region_id>", methods=["PUT"])
def edit_region(region_id):
    data = request.get_json()
    schema = RegionSchema()
    validated_data = schema.load(data, partial=True)
    region = update(region_id, validated_data)
    if not region:
        return {"message": "Region not found"}, 404
    return schema.dump(region), 200

@region_bp.route("/<int:region_id>", methods=["DELETE"])
def remove_region(region_id):
    region = delete(region_id)
    if not region:
        return {"message": "Region not found"}, 404
    return {"message": "Region deleted"}, 200