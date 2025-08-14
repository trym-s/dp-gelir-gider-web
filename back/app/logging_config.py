# app/logging_config.py
import logging, json, threading, queue
import logging.handlers
from flask import has_request_context, g, request
from app import db
from sqlalchemy.orm import sessionmaker
from app.logs.models import AppLog

# --- Ayarlar ---
QUEUE_SIZE   = 10000
BATCH_SIZE   = 200
FLUSH_EVERY  = 1.0   # saniye
LOG_TO_DB    = True  # istersen env ile kapatırsın

# Ayrı sessionmaker: uygulama transaction’larını etkilemesin
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
    """QueueListener'ın çağırdığı tüketici. Batch halinde DB'ye yazar."""
    def __init__(self):
        super().__init__()
        self.buf = []
        self.lock = threading.Lock()

    def emit(self, record: logging.LogRecord):
        # Kayıtları RAM'de topla
        try:
            self.buf.append(self._to_row(record))
            if len(self.buf) >= BATCH_SIZE:
                self._flush()
        except Exception:
            # asla uygulamayı düşürme
            pass

    def _to_row(self, r: logging.LogRecord):
        # HTTP context varsa bazı alanları al
        req_id = method = path = None
        status = duration_ms = None
        if has_request_context():
            req_id = str(getattr(g, "request_id", "") or "") or None
            method = (request.method or "")[:8]
            path   = (request.path or "")[:256]
            status = getattr(r, "status", None)
            duration_ms = getattr(r, "duration_ms", None)

        return AppLog(
            logger      = (r.name or "")[:64],
            level       = r.levelno,
            message     = (r.getMessage() or "")[:4000],
            request_id  = req_id,
            http_method = getattr(r, "method", None) or method,
            http_path   = getattr(r, "path", None) or path,
            status_code = status,
            duration_ms = duration_ms,
            url         = getattr(r, "url", None),
            sql_preview = getattr(r, "sql_preview", None),
            user_id     = getattr(r, "user_id", None),
            extra       = json.dumps({
                "module": r.module, "func": r.funcName, "line": r.lineno,
                "error_type": getattr(r, "error_type", None),
                "extra": getattr(r, "extra", None),
            }, ensure_ascii=False),
        )

    def _flush(self):
        if not self.buf:
            return
        rows = self.buf
        self.buf = []
        sess = _get_session()
        try:
            sess.bulk_save_objects(rows)
            sess.commit()
        except Exception:
            # Yut; log yazamadıysan uygulamayı bloklama
            sess.rollback()
        finally:
            sess.close()

    def close(self):
        try:
            with self.lock:
                self._flush()
        finally:
            super().close()

class _QueueFilter(logging.Filter):
    """Aşırı gürültülü logger’ları kırpmak için kullanabiliriz."""
    def filter(self, record: logging.LogRecord) -> bool:
        # İstersen burada pattern bazlı filtreler ekleyebilirsin
        return True

def configure_logging(app):
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Konsola yaz (görünürlük için)
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))

    root.handlers.clear()
    root.addHandler(console)

    # SQLAlchemy engine logger'ını kıs
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    if not LOG_TO_DB:
        return

    # Queue tabanlı non-blocking logging
    q = queue.Queue(maxsize=QUEUE_SIZE)
    qh = logging.handlers.QueueHandler(q)
    qh.addFilter(_QueueFilter())
    qh.setLevel(logging.INFO)
    root.addHandler(qh)

    consumer = _DbConsumer()
    listener = logging.handlers.QueueListener(q, consumer, respect_handler_level=True)
    listener.daemon = True
    listener.start()

    # Uygulama kapanırken flush (dev server’da da çalışır)
    @app.teardown_appcontext
    def _flush_logs(_exc):
        try:
            consumer.close()
        except Exception:
            pass

