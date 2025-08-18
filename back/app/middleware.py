#app/middleware.py
import time, uuid, logging
from flask import g, request

http_log = logging.getLogger("http")

def register_middlewares(app):
    @app.before_request
    def _start():
        g.request_id = uuid.uuid4()
        g._t0 = time.perf_counter()

    @app.after_request
    def _end(resp):
        try:
            dur_ms = int((time.perf_counter() - g._t0) * 1000) if hasattr(g, "_t0") else None
            http_log.info(
                "http request",
                extra={
                    "request_id": str(getattr(g, "request_id", "")),
                    "method": request.method,
                    "path": request.path,
                    "status": resp.status_code,
                    "duration_ms": dur_ms,
                }
            )
        except Exception:
            # Log yazarken uygulamayı bozma
            pass
        return resp
