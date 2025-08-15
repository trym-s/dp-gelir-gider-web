
# app/logging_utils.py
from functools import wraps
from marshmallow import ValidationError
from flask import has_request_context, request, g
from app.errors import AppError

import logging
import os
import random
import json

# --- Loggers (DB whitelist'inde) --------------------------------------------
DOMAIN_LOG = logging.getLogger("domain")
OUT_LOG    = logging.getLogger("outbound")

# --- Masking ---------------------------------------------------------------
_MASK_FIELDS = {"password", "token", "authorization", "card_no", "iban"}
_MAX_STR = 512

def _mask(o):
    if isinstance(o, dict):
        return {k: ("***" if k.lower() in _MASK_FIELDS else _mask(v)) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_mask(x) for x in o]
    try:
        s = str(o)
    except Exception:
        s = "<unserializable>"
    return s if len(s) <= _MAX_STR else s[:_MAX_STR] + "…"

# --- Core event writer ------------------------------------------------------
def log_event(logger, level, msg, *, err: Exception | None = None, **kv):
    extra = {
        "error_type": type(err).__name__ if err else None,
        "extra": _mask(kv) or None,
    }

    if has_request_context():
        extra["request_id"] = str(getattr(g, "request_id", "") or "")
        extra["user_id"] = getattr(g, "user_id", None)
        # İstek gövdesinden küçük bir preview ekle (maskeli)
        try:
            if request.is_json:
                extra["extra"] = extra.get("extra") or {}
                extra["extra"]["req_body_preview"] = _mask(request.get_json(silent=True) or {})
        except Exception:
            pass

    logger.log(level, msg, extra=extra, exc_info=err)

# --- Convenience ------------------------------------------------------------
def dinfo(msg, **kv):  log_event(DOMAIN_LOG, logging.INFO, msg, **kv)
def dwarn(msg, **kv):  log_event(DOMAIN_LOG, logging.WARNING, msg, **kv)
def derr(msg, err=None, **kv): log_event(DOMAIN_LOG, logging.ERROR, msg, err=err, **kv)

def oinfo(msg, **kv): log_event(OUT_LOG, logging.INFO, msg, **kv)
def oerr(msg, err=None, **kv): log_event(OUT_LOG, logging.ERROR, msg, err=err, **kv)

# --- Sampling for high-frequency INFO --------------------------------------
_INFO_SAMPLE = float(os.getenv("DOMAIN_INFO_SAMPLE", "0.10"))  # %10 varsayılan

def dinfo_sampled(msg, **kv):
    if random.random() <= _INFO_SAMPLE:
        log_event(DOMAIN_LOG, logging.INFO, msg, **kv)

# --- Helpers ----------------------------------------------------------------
def _status_from_response(resp):
    """Flask Response|tuple|None -> int status"""
    if resp is None:
        return 200
    code = getattr(resp, "status_code", None)
    if code:
        return int(code)
    if isinstance(resp, tuple):
        # (payload, status) veya (payload, status, headers)
        if len(resp) >= 2 and isinstance(resp[1], int):
            return resp[1]
    return 200

# --- Route decorator --------------------------------------------------------
def route_logger(fn):
    """
    - GET: enter/exit INFO logları SAMPLE edilir (gürültüyü azaltır).
    - Diğer metodlar: tam INFO.
    - AppError/ValidationError: WARNING (4xx), yeniden raise.
    - Diğer istisnalar: ERROR, yeniden raise (global handler 5xx üretir).
    """
    @wraps(fn)
    def _w(*args, **kwargs):
        is_get = (request.method == "GET")

        # enter
        if is_get:
            dinfo_sampled("route.enter", method=request.method, path=request.path, params=dict(request.args))
        else:
            dinfo("route.enter", method=request.method, path=request.path)

        try:
            resp = fn(*args, **kwargs)
            status = _status_from_response(resp)

            # exit
            if is_get:
                dinfo_sampled("route.exit", status=status)
            else:
                dinfo("route.exit", status=status)

            return resp

        except (ValidationError, AppError) as e:
            # 4xx sınıfı; business/validation
            dwarn("route.validation_or_business_error",
                  method=request.method, path=request.path,
                  status=getattr(e, "status_code", 400), message=str(e))
            raise
        except Exception as e:
            # 5xx; global handler stack'i yazacak, biz korelasyon için not düşüyoruz
            derr("route.unhandled", err=e, method=request.method, path=request.path)
            raise

    return _w

