# app/reminders/routes.py

from flask import Blueprint, jsonify
from app.reminders.services import get_all_reminders
from app.reminders.schemas import ReminderSchema
from app.logging_utils import route_logger, dinfo, dinfo_sampled  # structured logs

reminders_bp = Blueprint('reminders_api', __name__, url_prefix='/api/reminders')
schema = ReminderSchema(many=True)

@reminders_bp.route('/', methods=['GET'], strict_slashes=False)
@route_logger
def list_reminders():
    # GET çağrıları zaten decorator ile sampled enter/exit loglanır
    dinfo_sampled("reminders.list.enter")

    rows = get_all_reminders()

    dinfo("reminders.list.metrics", count=len(rows))
    return jsonify(schema.dump(rows)), 200

