from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.activity_log import activity_log_bp
from app.activity_log.models import ActivityLog, db

@activity_log_bp.route('/', methods=['GET'])
@jwt_required()
def get_activity_logs():
    """
    Get the activity logs for the current user.
    """
    try:
        user_id = get_jwt_identity()
        logs = db.session.query(ActivityLog).filter_by(user_id=user_id).order_by(ActivityLog.timestamp.desc()).limit(20).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        print(f"Error fetching activity logs: {e}")
        return jsonify({"message": "Could not retrieve activity logs."}), 500
