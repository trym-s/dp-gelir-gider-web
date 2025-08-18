
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

        # 1) app_logs'a yazarken kendimizi loglama
        st = (statement or "")
        st_low = st.lower()
        if " app_logs" in st_low or "into [app_logs]" in st_low:
            return

        # 2) Çok kısa sorguları boşuna denetleme
        if ms < SLOW_MS:
            return

        # 3) En fazla ilk 500 karakteri koy
        sql_log.warning("slow sql", extra={"duration_ms": int(ms), "sql_preview": st[:500]})
    except Exception:
        pass

