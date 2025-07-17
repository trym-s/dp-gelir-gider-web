from flask import Blueprint, request, jsonify
from app.company.services import get_all, create, update, delete, get_by_id
from app.company.schemas import CompanySchema

company_bp = Blueprint('company_api', __name__, url_prefix='/api/companies')

@company_bp.route("/", methods=["GET"], strict_slashes=False)
def list_companies():
    companies = get_all()
    schema = CompanySchema(many=True)
    return jsonify(schema.dump(companies)), 200

@company_bp.route("/<int:company_id>", methods=["GET"])
def get_company(company_id):
    company = get_by_id(company_id)
    if not company:
        return jsonify({"message": "Company not found"}), 404
    schema = CompanySchema()
    return jsonify(schema.dump(company)), 200

@company_bp.route("/", methods=["POST"])
def add_company():
    data = request.get_json()
    schema = CompanySchema()
    validated_data = schema.load(data)
    company = create(validated_data)
    return jsonify(schema.dump(company)), 201

@company_bp.route("/<int:company_id>", methods=["PUT"])
def edit_company(company_id):
    data = request.get_json()
    schema = CompanySchema()
    validated_data = schema.load(data, partial=True)
    company = update(company_id, validated_data)
    if not company:
        return {"message": "Company not found"}, 404
    return jsonify(schema.dump(company)), 200

@company_bp.route("/<int:company_id>", methods=["DELETE"])
def remove_company(company_id):
    company = delete(company_id)
    if not company:
        return {"message": "Company not found"}, 404
    return {"message": "Company deleted"}, 200
