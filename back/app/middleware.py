
# app/middleware.py
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import time, uuid, logging
from flask import g, request
http_log = logging.getLogger("http")

# İstersen bazı path'leri tamamen atla:
SKIP_PREFIXES = ("/static/",)
SKIP_PATHS = {"/_health"}

def register_middlewares(app):
    @app.before_request
    def _start():
        g.request_id = uuid.uuid4()
        g._t0 = time.perf_counter()
        try:
            verify_jwt_in_request(optional=True)
            ident = get_jwt_identity()
            # identity int/str/dict olabilir; en makul id alanını kap
            if isinstance(ident, dict):
                g.user_id = ident.get("id") or ident.get("user_id") or ident.get("sub")
            else:
                g.user_id = ident
        except Exception:
            g.user_id = None

    @app.after_request
    def _end(resp):
        try:
            p = request.path or ""
            if p in SKIP_PATHS or p.startswith(SKIP_PREFIXES) or request.method == "OPTIONS":
                return resp

            dur_ms = int((time.perf_counter() - g._t0) * 1000) if hasattr(g, "_t0") else None
            http_log.info(
                "http request",
                extra={
                "request_id": str(getattr(g, "request_id", "")),
                "method": request.method,
                "path": request.path,
                "status": resp.status_code,
            "duration_ms": dur_ms,
            "user_id": getattr(g, "user_id", None),
            "sql_preview": (getattr(g, "_sql_max", (None, None))[1] or None),  # <<<<< eklendi
            }
        )            
        except Exception:
            pass
        return resp

