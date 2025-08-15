
import functools
import json
import logging
from flask import g
from app import db
from app.logs.models import ServiceLog

logger = logging.getLogger(__name__)

def log_service_call(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            params = json.dumps({
                "args": args,
                "kwargs": kwargs
            }, default=str)
        except Exception:
            params = str(args) + str(kwargs)

        user_id = getattr(g, "user_id", None)

        log_entry = ServiceLog(
            service_name=func.__name__,
            params=params,
            status="PENDING",
            user_id=user_id
        )

        db.session.add(log_entry)
        db.session.commit()  # ID’sini almak için

        try:
            result = func(*args, **kwargs)
            # Sonuç JSON’a çevrilebilir mi?
            try:
                result_str = json.dumps(result, default=str)[:500]
            except Exception:
                result_str = str(result)[:500]

            log_entry.status = "SUCCESS"
            log_entry.result = result_str

        except Exception as e:
            log_entry.status = "ERROR"
            log_entry.error_message = str(e)
            logger.exception(f"Error in service {func.__name__}")
            db.session.commit()
            raise  # Hata yine dışarı fırlatılır

        db.session.commit()
        return result
    return wrapper
