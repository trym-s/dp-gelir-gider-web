# app/logging_config.py
import logging
import logging.handlers  # QueueHandler, QueueListener
import json, threading, queue
from flask import has_request_context, g, request
from app import db
from sqlalchemy.orm import sessionmaker
from app.logs.models import AppLog

# Settings
QUEUE_SIZE  = 10000
BATCH_SIZE  = 200
WHITELIST   = {"http", "errors", "sql", "outbound", "domain"}  # sadece bunlar DB'ye

# Isolated DB session
_LogSession = None
_sess_lock = threading.Lock()
def _get_session():
    global _LogSession
    if _LogSession is None:
        with _sess_lock:
            if _LogSession is None:
                _LogSession = sessionmaker(bind=db.engine)
    return _LogSession()

class _DbConsumer(logging.Handler):
    def __init__(self):
        super().__init__()
        self.buf = []

    def emit(self, record: logging.LogRecord):
        try:
            self.buf.append(self._to_row(record))
            if len(self.buf) >= BATCH_SIZE:
                self._flush()
        except Exception:
            pass

    def _to_row(self, r: logging.LogRecord):
        # 1) Önce log extra'dan oku (QueueHandler LogRecord attribute'a taşır)
        req_id      = getattr(r, "request_id", None)
        method      = getattr(r, "method", None)
        path        = getattr(r, "path", None)
        status      = getattr(r, "status", None)
        duration_ms = getattr(r, "duration_ms", None)
        user_id     = getattr(r, "user_id", None)
        sql_prev    = getattr(r, "sql_preview", None)

        # 2) Boş kalanlar için (manuel loglar) context'ten tamamla
        if has_request_context():
            req_id = req_id or (str(getattr(g, "request_id", "") or "") or None)
            method = method or ((request.method or "")[:8])
            path   = path   or ((request.path or "")[:256])

        return AppLog(
            logger      = (r.name or "")[:64],
            level       = r.levelno,
            message     = (r.getMessage() or "")[:4000],
            request_id  = req_id,
            http_method = method,
            http_path   = path,
            status_code = status,
            duration_ms = duration_ms,
            sql_preview = sql_prev,
            user_id     = user_id,
            extra       = json.dumps({
                "module": r.module, "func": r.funcName, "line": r.lineno,
                "error_type": getattr(r, "error_type", None),
                "extra": getattr(r, "extra", None),
            }, ensure_ascii=False),
        )

    def _flush(self):
        if not self.buf:
            return
        rows, self.buf = self.buf, []
        sess = _get_session()
        try:
            sess.bulk_save_objects(rows)
            sess.commit()
        except Exception:
            sess.rollback()
        finally:
            sess.close()

    def close(self):
        try:
            self._flush()
        finally:
            super().close()

class _DbWhitelistFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.name in WHITELIST

def configure_logging(app):
    # Root
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # 1) Console
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
    root.handlers.clear()
    root.addHandler(console)

    # 2) Gürültüyü KAYNAĞINDA kes
    for name in ("sqlalchemy", "sqlalchemy.engine", "sqlalchemy.pool"):
        lg = logging.getLogger(name)
        lg.setLevel(logging.WARNING)
        lg.propagate = False
    logging.getLogger("werkzeug").setLevel(logging.INFO)

    # 3) Queue + whitelist → DB
    q = queue.Queue(maxsize=QUEUE_SIZE)
    qh = logging.handlers.QueueHandler(q)
    qh.setLevel(logging.INFO)
    qh.addFilter(_DbWhitelistFilter())
    root.addHandler(qh)

    consumer = _DbConsumer()
    listener = logging.handlers.QueueListener(q, consumer, respect_handler_level=True)
    listener.daemon = True
    listener.start()

    @app.teardown_appcontext
    def _flush_logs(_exc):
        try:
            consumer.close()
        except Exception:
            pass

