
# app/bank_logs/services.py
from __future__ import annotations
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from app import db
from app.base_service import BaseService
from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr

from app.banks.models import BankAccount, Bank
from .models import BankLog, Period
from ..banks.schemas import BankSchema


# ------------------------- helpers -------------------------

def _coerce_date(v: Any, field: str = "date") -> date:
    """
    'YYYY-MM-DD' bekler. Hatalıysa AppError(400).
    (İstersen '%d.%m.%Y' desteği de ekleyebilirsin.)
    """
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    if isinstance(v, str):
        try:
            return datetime.strptime(v.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise AppError(f"{field} must be YYYY-MM-DD.", 400, code="INVALID_DATE", details={"field": field, "given": v})
    raise AppError(f"{field} has invalid type.", 400, code="INVALID_DATE_TYPE", details={"field": field, "type": type(v).__name__})

def _coerce_period(v: Any, field: str = "period") -> Period:
    """
    'morning' / 'evening' (value) veya 'MORNING' / 'EVENING' (name) ya da 'Period.MORNING' gibi şeyleri kabul et.
    Hatalıysa AppError(400).
    """
    if isinstance(v, Period):
        return v
    if isinstance(v, str):
        s = v.strip()
        # 'Period.MORNING' -> 'MORNING'
        if "." in s:
            s = s.split(".")[-1]
        # value olarak ('morning') gelirse:
        lowered = s.lower()
        for p in Period:
            if getattr(p, "value", "").lower() == lowered:
                return p
        # name olarak ('MORNING') gelirse:
        uppered = s.upper()
        try:
            return Period[uppered]  # type: ignore[index]
        except Exception:
            pass
    raise AppError(f"{field} is invalid.", 400, code="INVALID_PERIOD", details={"given": v})

def _to_decimal(v: Any, field: str) -> Decimal | None:
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError):
        raise AppError(f"{field} must be a number.", 400, code="INVALID_DECIMAL", details={"field": field, "given": v})

def _serialize_amount(x: Decimal | None) -> str | None:
    return None if x is None else f"{x}"


# ------------------------- service -------------------------

class BankLogService(BaseService):
    def __init__(self):
        super().__init__(BankLog)

    # ------- READ -------

    @service_logger
    def get_all_logs_for_period(self, date_str: str, period_str: str) -> List[Dict[str, Any]]:
        """
        Verilen gün + period için tüm bankaların loglarını döner.
        Log olmayan bankalar için placeholder üretir.
        """
        d = _coerce_date(date_str, "date")
        p = _coerce_period(period_str, "period")

        banks = Bank.query.options(
            joinedload(Bank.accounts)  # gerekirse
        ).all()

        bank_schema = BankSchema()
        out: List[Dict[str, Any]] = []

        for bank in banks:
            log = (
                self.model.query
                .filter_by(bank_id=bank.id, date=d, period=p)
                .first()
            )

            bank_data = bank_schema.dump(bank)

            if log:
                bank_data["log"] = {
                    "id": log.id,
                    "bank_id": log.bank_id,
                    "date": d.isoformat(),
                    "period": p.value if hasattr(p, "value") else str(p),
                    "amount_try": _serialize_amount(log.amount_try),
                    "amount_usd": _serialize_amount(log.amount_usd),
                    "amount_eur": _serialize_amount(log.amount_eur),
                    "amount_aed": _serialize_amount(log.amount_aed),
                    "amount_gbp": _serialize_amount(log.amount_gbp),
                    "rate_usd_try": _serialize_amount(log.rate_usd_try),
                    "rate_eur_try": _serialize_amount(log.rate_eur_try),
                    "rate_aed_try": _serialize_amount(log.rate_aed_try),
                    "rate_gbp_try": _serialize_amount(log.rate_gbp_try),
                }
            else:
                bank_data["log"] = {
                    "id": f"new-{bank.id}-{d.isoformat()}-{p.name}",
                    "bank_id": bank.id,
                    "date": d.isoformat(),
                    "period": p.value if hasattr(p, "value") else str(p),
                    "amount_try": "0.00",
                    "amount_usd": "0.00",
                    "amount_eur": "0.00",
                    "amount_aed": "0.00",
                    "amount_gbp": "0.00",
                    "rate_usd_try": None,
                    "rate_eur_try": None,
                    "rate_aed_try": None,
                    "rate_gbp_try": None,
                }

            out.append(bank_data)

        dinfo("bank_logs.by_period", date=d.isoformat(), period=p.name, banks=len(banks), rows=len(out))
        return out

    # ------- UPSERT (single/batch) -------

    def _prepare_log_from_data(self, data: Dict[str, Any], existing: BankLog | None = None) -> BankLog:
        """Body'yi parse eder ve (varsa) mevcut logu patch'ler; yoksa yeni instance döner (session'a ekleme yapmaz)."""
        if not isinstance(data, dict):
            raise AppError("Body must be an object.", 400, code="INVALID_BODY")

        required = ["bank_id", "date", "period", "amount_try", "amount_usd", "amount_eur", "amount_aed", "amount_gbp"]
        missing = [k for k in required if k not in data]
        if missing:
            raise AppError("Missing required fields.", 400, code="MISSING_FIELDS", details={"fields": missing})

        bank_id = int(data["bank_id"])
        d = _coerce_date(data["date"], "date")
        p = _coerce_period(data["period"], "period")

        # miktarlar
        attrs = {
            "amount_try": _to_decimal(data.get("amount_try"), "amount_try"),
            "amount_usd": _to_decimal(data.get("amount_usd"), "amount_usd"),
            "amount_eur": _to_decimal(data.get("amount_eur"), "amount_eur"),
            "amount_aed": _to_decimal(data.get("amount_aed"), "amount_aed"),
            "amount_gbp": _to_decimal(data.get("amount_gbp"), "amount_gbp"),
            "rate_usd_try": _to_decimal(data.get("rate_usd_try"), "rate_usd_try"),
            "rate_eur_try": _to_decimal(data.get("rate_eur_try"), "rate_eur_try"),
            "rate_aed_try": _to_decimal(data.get("rate_aed_try"), "rate_aed_try"),
            "rate_gbp_try": _to_decimal(data.get("rate_gbp_try"), "rate_gbp_try"),
        }

        # mevcut var mı?
        log = existing or (
            self.model.query
            .filter_by(bank_id=bank_id, date=d, period=p)
            .first()
        )

        if log:
            for k, v in attrs.items():
                setattr(log, k, v)
        else:
            log = self.model(bank_id=bank_id, date=d, period=p, **attrs)

        return log

    @service_logger
    def create_or_update_log(self, data: Dict[str, Any], commit: bool = True) -> BankLog:
        log = self._prepare_log_from_data(data)
        if not getattr(log, "id", None):
            db.session.add(log)

        if commit:
            try:
                db.session.commit()
            except IntegrityError as ie:
                db.session.rollback()
                # muhtemel uniq violation vs.
                raise AppError("Could not save bank log (integrity).", 409, code="INTEGRITY_ERROR")
            except Exception as ex:
                db.session.rollback()
                derr("bank_logs.upsert.unhandled", err=ex)
                raise

        dinfo("bank_logs.upsert", bank_id=log.bank_id, date=log.date.isoformat(), period=log.period.name)
        return log

    @service_logger
    def batch_upsert_logs(self, logs_data: List[Dict[str, Any]]) -> List[BankLog]:
        if not isinstance(logs_data, list) or not logs_data:
            raise AppError("Body must be a non-empty list.", 400, code="INVALID_BODY")

        rows: List[BankLog] = []
        for item in logs_data:
            log = self._prepare_log_from_data(item)
            if not getattr(log, "id", None):
                db.session.add(log)
            rows.append(log)

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise AppError("Could not save bank logs (integrity).", 409, code="INTEGRITY_ERROR")
        except Exception as ex:
            db.session.rollback()
            derr("bank_logs.batch.unhandled", err=ex)
            raise

        dinfo("bank_logs.batch_upsert", count=len(rows))
        return rows


bank_log_service = BankLogService()

