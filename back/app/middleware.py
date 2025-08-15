
# app/middleware.py
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
        # JWT varsa burada g.user_id set edebilirsin; yoksa boş kalsın.
        # örn: g.user_id = get_jwt_identity()  (uyarlarsın)

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
                }
            )
        except Exception:
            pass
        return resp

