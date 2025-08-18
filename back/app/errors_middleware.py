# app/errors.py
import logging
from flask import Blueprint, g
from werkzeug.exceptions import HTTPException

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
