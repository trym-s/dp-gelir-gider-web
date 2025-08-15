# app/reminders/routes.py

from flask import Blueprint, jsonify
from app.reminders.services import get_all_reminders
from app.reminders.schemas import ReminderSchema

reminders_bp = Blueprint('reminders_api', __name__, url_prefix='/api/reminders')
schema = ReminderSchema(many=True)

@reminders_bp.route('/', methods=['GET'], strict_slashes=False)
def list_reminders():
    try:
        reminders = get_all_reminders()
        return jsonify(schema.dump(reminders)), 200
    except Exception as e:
        print(f"ERROR in list_reminders: {e}")
        # Geliştirme aşamasında daha detaylı hata görmek için:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred."}), 500