# app/sql_events.py
import logging, time
from sqlalchemy import event
from sqlalchemy.engine import Engine

sql_log = logging.getLogger("sql")
SLOW_MS = 200  # ms

@event.listens_for(Engine, "before_cursor_execute")
def _before_cursor_execute(conn, cursor, statement, params, context, executemany):
    context._query_start = time.perf_counter()

@event.listens_for(Engine, "after_cursor_execute")
def _after_cursor_execute(conn, cursor, statement, params, context, executemany):
    try:
        if not hasattr(context, "_query_start"):
            return
        ms = (time.perf_counter() - context._query_start) * 1000
        if ms < SLOW_MS:
            return
        st_low = (statement or "").lower()
        if " app_logs" in st_low:  # kendi insert'lerimizi loglama
            return
        sql_log.warning("slow sql", extra={"duration_ms": int(ms), "sql_preview": statement[:500]})
    except Exception:
        pass

