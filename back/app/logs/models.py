# app/logs/models.py
from app import db
from sqlalchemy import func, Index
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from datetime import datetime


class AppLog(db.Model):
    __tablename__ = "app_logs"

    id           = db.Column(db.BigInteger, primary_key=True)
    created_at   = db.Column(db.DateTime, nullable=False, server_default=func.sysutcdatetime())

    logger       = db.Column(db.String(64),  nullable=False)   # http | errors | sql | outbound | domain
    level        = db.Column(db.SmallInteger, nullable=False)  # 20=INFO, 30=WARN, 40=ERROR, 50=CRITICAL
    message      = db.Column(db.String(4000), nullable=False)

    request_id   = db.Column(UNIQUEIDENTIFIER, nullable=True)
    http_method  = db.Column(db.String(8))
    http_path    = db.Column(db.String(256))
    status_code  = db.Column(db.Integer)
    duration_ms  = db.Column(db.Integer)

    sql_preview  = db.Column(db.String(1500))       # slow SQL için
    user_id      = db.Column(db.Integer)

    extra        = db.Column(db.Text)              # JSON; Alembic migration’da ISJSON check ekleyeceğiz

Index("ix_app_logs_time",        AppLog.created_at.desc())
Index("ix_app_logs_logger_time", AppLog.logger, AppLog.created_at.desc())
Index("ix_app_logs_req",         AppLog.request_id)
Index("ix_app_logs_http_time",   AppLog.http_path, AppLog.created_at.desc())
Index("ix_app_logs_level_time",  AppLog.level, AppLog.created_at.desc())


class ServiceLog(db.Model):
    __tablename__ = "service_logs"

    id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(255), nullable=False)
    params = db.Column(db.Text, nullable=True)
    result = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False)  # SUCCESS / ERROR
    error_message = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
