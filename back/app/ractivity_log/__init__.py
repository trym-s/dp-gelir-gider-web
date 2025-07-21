from flask import Blueprint

activity_log_bp = Blueprint('activity_log_api', __name__, url_prefix='/api/activity-log')

from . import routes
