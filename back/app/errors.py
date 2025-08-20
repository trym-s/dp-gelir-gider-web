# app/errors.py
import os, logging, traceback
from flask import Blueprint, jsonify, request, g
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError, DataError, OperationalError, ProgrammingError

# ---- Public API ------------------------------------------------------------

class AppError(Exception):
    """Business/validation error -> return 4xx with a clean message."""
    def __init__(self, message, status_code=400, code=None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = int(status_code)
        self.code = code or (str(status_code))
        self.details = details or {}

    def to_dict(self):
        return {"ok": False, "error": {"type": "AppError", "message": self.message, "code": self.code, "details": self.details}}

def register_error_handlers(app):
    """Call this once in create_app()."""
    app.register_error_handler(AppError, _handle_app_error)
    app.register_error_handler(Exception, _handle_any_exception)

# ---- Internal --------------------------------------------------------------

DEV = os.getenv("FLASK_ENV") in {"development", "dev", "local"}
err_log = logging.getLogger("errors")
errors_bp = Blueprint("errors", __name__)  # optional, kept for future if needed

def _jsonify_with_req(payload, status):
    resp = jsonify(payload)
    # surface request-id for clients
    rid = str(getattr(g, "request_id", "")) if hasattr(g, "request_id") else ""
    if rid:
        resp.headers["X-Request-Id"] = rid
        # also include in body for convenience
        if isinstance(payload, dict):
            payload.setdefault("error", {})
            if isinstance(payload["error"], dict):
                payload["error"].setdefault("request_id", rid)
    resp.status_code = status
    return resp

def _handle_app_error(e: AppError):
    # business/validation: 4xx
    err_log.warning(
        "AppError: %s", e.message,
        extra={
            "user_id": getattr(g, "user_id", None),
            "error_type": "AppError",
            "extra": {
                "status_code": e.status_code,
                "path": getattr(request, "path", None),
                "method": getattr(request, "method", None),
                "code": e.code,
                "details": e.details
            }
        }
    )
    return _jsonify_with_req(e.to_dict(), e.status_code)

def _classify_sqlalchemy(e: Exception):
    if isinstance(e, IntegrityError):
        return 409, "IntegrityError", "Data integrity violation"
    if isinstance(e, DataError):
        return 400, "DataError", "Invalid or out-of-range data"
    if isinstance(e, OperationalError):
        return 503, "OperationalError", "Database is unavailable or timed out"
    if isinstance(e, ProgrammingError):
        return 500, "ProgrammingError", "Database programming error"
    return 500, type(e).__name__, "Unhandled exception"

def _handle_any_exception(e: Exception):
    # HTTPExceptions keep their own status
    if isinstance(e, HTTPException):
        status = e.code or 500
        err_type = type(e).__name__
        user_msg = str(e)
    else:
        status, err_type, user_msg = _classify_sqlalchemy(e)

    # Always log full stack to "errors"
    err_log.error(
        f"{err_type}: {user_msg}",
        exc_info=e,
        extra={
            "user_id": getattr(g, "user_id", None),             
            "error_type": err_type,
            "extra": {
                "path": getattr(request, "path", None),
                "method": getattr(request, "method", None),
            }
        },
    )

    # Safe client payload (prod masks message on 5xx)
    payload = {
        "ok": False,
        "error": {
            "type": err_type,
            "message": user_msg if status < 500 else "Internal Server Error",
            "code": status,
            "details": {},
        }
    }
    if DEV:
        payload["error"]["dev"] = {
            "exception_message": str(e),
            "traceback": "".join(traceback.format_exception(type(e), e, e.__traceback__))[:4000],
        }

    return _jsonify_with_req(payload, status)

