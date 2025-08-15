
# app/logs/decorators.py
import functools
import json
import logging
import uuid
from flask import g
from app import db
from app.logs.models import ServiceLog

logger = logging.getLogger(__name__)

def service_logger(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        request_id = str(uuid.uuid4())
        user_id = getattr(g, "user_id", None)
        params_json = None

        try:
            params_json = json.dumps({"args": args, "kwargs": kwargs}, default=str)

            # Call the original service function
            result = func(*args, **kwargs)

            # Log to DB
            log_entry = ServiceLog(
                service_name=func.__qualname__,
                params=params_json,
                result=json.dumps(result, default=str) if result else None,
                status="SUCCESS",
                user_id=user_id
            )
            db.session.add(log_entry)
            db.session.commit()

            # Also log to file/console
            logger.info(f"[{request_id}] SUCCESS {func.__qualname__}")

            return result

        except Exception as e:
            db.session.rollback()

            # Log to DB
            log_entry = ServiceLog(
                service_name=func.__qualname__,
                params=params_json,
                status="ERROR",
                error_message=str(e),
                user_id=user_id
            )
            db.session.add(log_entry)
            db.session.commit()

            # Log to file/console
            logger.exception(f"[{request_id}] ERROR {func.__qualname__}: {e}")

            raise  # Re-raise for normal error handling
    return wrapper

