from flask import Blueprint, request, jsonify, logging
from app.expense.supplier_services import get_all_suppliers, get_supplier_by_id, create_supplier, update_supplier, delete_supplier
from app.expense.supplier_schemas import SupplierSchema

supplier_bp = Blueprint('supplier_api', __name__, url_prefix='/api/suppliers')

@supplier_bp.route('/', methods=['GET'])
def list_suppliers():
    try:
        suppliers = get_all_suppliers()
        schema = SupplierSchema(many=True)
        return jsonify(schema.dump(suppliers)), 200
    except Exception as e:
        logging.exception("Error in list_suppliers")
        return jsonify({"error": "An internal server error occurred."}), 500

@supplier_bp.route('/<int:supplier_id>', methods=['GET'])
def get_supplier(supplier_id):
    try:
        supplier = get_supplier_by_id(supplier_id)
        if not supplier:
            return jsonify({"message": "Supplier not found"}), 404
        schema = SupplierSchema()
        return jsonify(schema.dump(supplier)), 200
    except Exception as e:
        logging.exception("Error in get_supplier")
        return jsonify({"error": "An internal server error occurred."}), 500

@supplier_bp.route('/', methods=['POST'])
def add_supplier():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"message": "Name is required"}), 400
    try:
        new_supplier = create_supplier(data)
        schema = SupplierSchema()
        return jsonify(schema.dump(new_supplier)), 201
    except Exception as e:
        logging.exception("Error in add_supplier")
        return jsonify({"error": "An internal server error occurred."}), 500

@supplier_bp.route('/<int:supplier_id>', methods=['PUT'])
def edit_supplier(supplier_id):
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"message": "Name is required"}), 400
    try:
        updated_supplier = update_supplier(supplier_id, data)
        if not updated_supplier:
            return jsonify({"message": "Supplier not found"}), 404
        schema = SupplierSchema()
        return jsonify(schema.dump(updated_supplier)), 200
    except Exception as e:
        logging.exception("Error in edit_supplier")
        return jsonify({"error": "An internal server error occurred."}), 500

@supplier_bp.route('/<int:supplier_id>', methods=['DELETE'])
def remove_supplier(supplier_id):
    try:
        supplier = delete_supplier(supplier_id)
        if not supplier:
            return jsonify({"message": "Supplier not found"}), 404
        return jsonify({"message": "Supplier deleted"}), 200
    except Exception as e:
        logging.exception("Error in remove_supplier")
        return jsonify({"error": "An internal server error occurred."}), 500
