from flask import Blueprint, jsonify
from .services import activity_log_service

activity_log_bp = Blueprint('activity_log_api', __name__, url_prefix='/api/activity-log')

@activity_log_bp.route('/', methods=['GET'])
def get_activity_logs():
    try:
        logs = activity_log_service.get_all()
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
