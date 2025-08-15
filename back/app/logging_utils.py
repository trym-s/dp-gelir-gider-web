from functools import wraps
from marshmallow import ValidationError
from app.errors import AppError
import logging, json
from flask import has_request_context, request, g

DOMAIN_LOG = logging.getLogger("domain")      # DB whitelist'inde var
OUT_LOG    = logging.getLogger("outbound")    # DB whitelist'inde var

_MASK_FIELDS = {"password","token","authorization","card_no","iban"}
_MAX_STR = 512

def _mask(o):
    if isinstance(o, dict):
        return {k: ("***" if k.lower() in _MASK_FIELDS else _mask(v)) for k,v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_mask(x) for x in o]
    s = str(o)
    return (s if len(s) <= _MAX_STR else s[:_MAX_STR] + "…")

def log_event(logger, level, msg, *, err: Exception|None=None, **kv):
    extra = {"error_type": type(err).__name__ if err else None, "extra": _mask(kv) or None}
    if has_request_context():
        extra["request_id"] = str(getattr(g, "request_id", "") or "")
        # optional: short body preview
        try:
            if request.is_json:
                extra["extra"] = extra.get("extra") or {}
                extra["extra"]["req_body_preview"] = _mask(request.get_json(silent=True) or {})
        except Exception: pass
    logger.log(level, msg, extra=extra, exc_info=err)

def dinfo(msg, **kv):  log_event(DOMAIN_LOG, logging.INFO, msg, **kv)
def dwarn(msg, **kv):  log_event(DOMAIN_LOG, logging.WARNING, msg, **kv)
def derr(msg, err=None, **kv): log_event(DOMAIN_LOG, logging.ERROR, msg, err=err, **kv)

def oinfo(msg, **kv): log_event(OUT_LOG, logging.INFO, msg, **kv)
def oerr(msg, err=None, **kv): log_event(OUT_LOG, logging.ERROR, msg, err=err, **kv)




def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
def route_logger(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        dinfo("route.enter", method=request.method, path=request.path, params=dict(request.args))
        try:
            resp = fn(*args, **kwargs)
            # Flask response objesi veya (payload, code) tuple gelebilir
            status = getattr(resp, "status_code", None) or (len(resp) > 1 and resp[1]) or 200
            dinfo("route.exit", status=status)
            return resp
        except (ValidationError, AppError) as e:
            # Bunlar 4xx; global handler’a gerek yok, framework zaten handle ediyor
            dwarn("route.validation_or_business_error", reason=str(e))
            raise
        except Exception as e:
            # 5xx; global handler loglayacak ama domain korelasyonu için de not düş
            derr("route.unhandled", err=e)
            raise
    return wrapper
