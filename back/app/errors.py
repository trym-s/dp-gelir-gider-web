from flask import jsonify
import logging
from flask import Blueprint, g
from werkzeug.exceptions import HTTPException

class AppError(Exception):
    """Base application error class."""
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def to_dict(self):
        return {'error': self.message}

def handle_app_error(error):
    """Handler for AppError exceptions."""
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

def handle_generic_error(error):
    """Handler for generic 500 errors."""
    response = jsonify({'error': 'Internal Server Error'})
    response.status_code = 500
    return response

def register_error_handlers(app):
    app.register_error_handler(AppError, handle_app_error)
    app.register_error_handler(Exception, handle_generic_error)



err_log = logging.getLogger("errors")
errors_bp = Blueprint("errors", __name__)

@errors_bp.app_errorhandler(Exception)
def _handle(e):
    if isinstance(e, HTTPException):
        code = e.code or 500
        msg = str(e)
    else:
        code = 500
        msg = "Unhandled exception"

    err_log.error(
        msg,
        exc_info=e,
        extra={
            "request_id": str(getattr(g, "request_id", "")),
            "error_type": type(e).__name__,
        }
    )
    return {"ok": False, "error": msg}, code
