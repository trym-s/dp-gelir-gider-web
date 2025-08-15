# app/sql_events.py
import os
import logging
import time
from flask import has_request_context, g
from sqlalchemy import event
from sqlalchemy.engine import Engine

sql_log = logging.getLogger("sql")
SLOW_MS = int(os.getenv("SQL_SLOW_MS", "200"))  # override with env if needed

@event.listens_for(Engine, "before_cursor_execute")
def _before_cursor_execute(conn, cursor, statement, params, context, executemany):
    context._query_start = time.perf_counter()

@event.listens_for(Engine, "after_cursor_execute")
def _after_cursor_execute(conn, cursor, statement, params, context, executemany):
    try:
        start = getattr(context, "_query_start", None)
        if start is None:
            return

        ms = (time.perf_counter() - start) * 1000.0

        # Track the slowest statement per request for HTTP log correlation
        if has_request_context():
            try:
                best_ms, _ = getattr(g, "_sql_max", (0, None))
                if ms > (best_ms or 0):
                    g._sql_max = (ms, (statement or "")[:500])
            except Exception:
                pass

        # Only log very slow queries
        if ms < SLOW_MS:
            return

        st_low = (statement or "").lower()
        # avoid logging our own log-table writes
        if any(name in st_low for name in ("app_logs", "service_logs")):
            return

        sql_log.warning(
            "slow sql",
            extra={
                "duration_ms": int(ms),
                "sql_preview": (statement or "")[:500],
            },
        )
    except Exception:
        # profiling must never break the app
        pass

