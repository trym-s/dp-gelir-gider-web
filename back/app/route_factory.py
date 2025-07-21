from flask import Blueprint, request, jsonify
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_api_blueprint(name, service, schema):
    """
    Creates a Flask Blueprint with standard CRUD routes.
    - name: The endpoint name (e.g., 'companies').
    - service: The BaseService instance for the model.
    - schema: The Marshmallow schema for serialization/deserialization.
    """
    bp = Blueprint(f'{name}_api', __name__, url_prefix=f'/api/{name}')
    
    @bp.route("/", methods=["GET"], strict_slashes=False)
    def list_all():
        items = service.get_all()
        return jsonify(schema.dump(items, many=True)), 200

    @bp.route("/<int:item_id>", methods=["GET"])
    def get_one(item_id):
        item = service.get_by_id(item_id)
        if not item:
            return jsonify({"message": f"Item not found"}), 404
        return jsonify(schema.dump(item)), 200

    @bp.route("/", methods=["POST"], strict_slashes=False)
    def create_one():
        logger.info(f"--- CREATE {name.upper()} (BACKEND) ---")
        try:
            json_data = request.get_json()
            if not json_data:
                return jsonify({"message": "No input data provided"}), 400
            logger.info(f"1. Received raw data: {json_data}")

            validated_instance = schema.load(json_data)
            logger.info(f"2. Validated instance: {validated_instance}")

            new_item = service.create(validated_instance)
            logger.info(f"3. Item created successfully: {new_item}")
            
            return jsonify(schema.dump(new_item)), 201
        except Exception as e:
            logger.error(f"!!! An error occurred in create for {name}: {e}", exc_info=True)
            return jsonify({"message": "An internal error occurred"}), 500

    @bp.route("/<int:item_id>", methods=["PUT"])
    def update_one(item_id):
        logger.info(f"--- UPDATE {name.upper()} (BACKEND) ID: {item_id} ---")
        try:
            json_data = request.get_json()
            if not json_data:
                return jsonify({"message": "No input data provided"}), 400
            logger.info(f"1. Received raw data: {json_data}")

            instance_to_update = service.get_by_id(item_id)
            if not instance_to_update:
                return jsonify({"message": "Item not found"}), 404

            validated_instance = schema.load(json_data, instance=instance_to_update, partial=True)
            logger.info(f"2. Validated instance for update: {validated_instance}")

            updated_item = service.update(item_id, validated_instance)
            logger.info(f"3. Item updated successfully: {updated_item}")

            return jsonify(schema.dump(updated_item)), 200
        except Exception as e:
            logger.error(f"!!! An error occurred in update for {name}: {e}", exc_info=True)
            return jsonify({"message": "An internal error occurred"}), 500

    @bp.route("/<int:item_id>", methods=["DELETE"])
    def delete_one(item_id):
        deleted_item = service.delete(item_id)
        if not deleted_item:
            return jsonify({"message": "Item not found"}), 404
        return jsonify({"message": "Item deleted successfully"}), 200

    return bp
