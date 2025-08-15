# app/income/services.py
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Iterable, List

from sqlalchemy import desc, asc, func, extract
from sqlalchemy.orm import joinedload

from app import db
from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr

from app.customer.models import Customer
from app.income.models import (
    Income, IncomeStatus, IncomeReceipt, PaymentTimelinessStatus, Currency
)


# ----------------------------- Helpers -----------------------------

def _parse_iso_date(v: str, field_name: str) -> date:
    try:
        return datetime.fromisoformat(v).date()
    except Exception:
        raise AppError(f"Invalid date for {field_name}. Expected YYYY-MM-DD.", 400)

def _to_decimal(v, field_name: str | None = None) -> Decimal:
    try:
        return Decimal(str(v))
    except Exception:
        raise AppError(f"Invalid decimal value{f' for {field_name}' if field_name else ''}.", 400)

def _coerce_status_list(vals: Iterable[str]) -> List[IncomeStatus]:
    out: List[IncomeStatus] = []
    for s in vals:
        s = (s or "").strip()
        if not s:
            continue
        try:
            out.append(IncomeStatus[s])
        except KeyError:
            raise AppError(f"Unknown income status: {s}", 400)
    return out


# ============================= Customers ============================

class CustomerService:
    @service_logger
    def get_by_id(self, customer_id: int) -> Customer:
        obj = Customer.query.get(customer_id)
        if not obj:
            raise AppError("Customer not found.", 404)
        return obj

    @service_logger
    def get_all(self):
        rows = Customer.query.order_by(Customer.name).all()
        dinfo("customer.list.service", count=len(rows))
        return rows

    @service_logger
    def create(self, data: dict) -> Customer:
        name = (data.get("name") or "").strip()
        if not name:
            raise AppError("Customer name is required.", 400)

        if Customer.query.filter_by(name=name).first():
            raise AppError(f"Customer with name '{name}' already exists.", 409)

        tax_number = (data.get("tax_number") or None)
        if tax_number and Customer.query.filter_by(tax_number=tax_number).first():
            raise AppError(f"'{tax_number}' vergi numarası zaten başka bir müşteriye atanmış.", 409)

        obj = Customer(name=name, tax_number=tax_number)
        db.session.add(obj)
        db.session.commit()
        dinfo("customer.create.committed", id=obj.id, name=name)
        return obj

    @service_logger
    def update(self, customer_id: int, data: dict) -> Customer:
        customer = self.get_by_id(customer_id)

        if "name" in data:
            new_name = (data.get("name") or "").strip()
            if not new_name:
                raise AppError("Customer name cannot be empty.", 400)
            if new_name != customer.name and Customer.query.filter(
                Customer.id != customer_id, Customer.name == new_name
            ).first():
                raise AppError(f"'{new_name}' isimli başka bir müşteri zaten var.", 409)
            customer.name = new_name

        if "tax_number" in data:
            new_tax = data.get("tax_number") or None
            if new_tax and Customer.query.filter(
                Customer.id != customer_id, Customer.tax_number == new_tax
            ).first():
                raise AppError(f"'{new_tax}' vergi numarası zaten başka bir müşteriye atanmış.", 409)
            customer.tax_number = new_tax

        db.session.commit()
        dinfo("customer.update.committed", id=customer_id)
        return customer


# ============================== Income ==============================

class IncomeService:
    @service_logger
    def get_by_id(self, income_id: int) -> Income:
        obj = Income.query.get(income_id)
        if not obj:
            raise AppError("Income not found.", 404)
        return obj

    @service_logger
    def get_all(
        self,
        filters: dict | None = None,
        sort_by: str = "issue_date",
        sort_order: str = "desc",
        page: int = 1,
        per_page: int = 20,
    ):
        q = Income.query.options(
            joinedload(Income.customer),
            joinedload(Income.region),
            joinedload(Income.account_name),
            joinedload(Income.budget_item),
        )

        filters = filters or {}
        # --- Search ---
        term = (filters.get("search_term") or "").strip()
        if term:
            like = f"%{term.lower()}%"
            q = q.filter(
                func.lower(Income.invoice_name).like(like)
                | func.lower(Income.invoice_number).like(like)
            )

        # --- Dates ---
        if filters.get("date_start"):
            q = q.filter(Income.issue_date >= _parse_iso_date(filters["date_start"], "date_start"))
        if filters.get("date_end"):
            q = q.filter(Income.issue_date <= _parse_iso_date(filters["date_end"], "date_end"))

        # --- Foreign keys ---
        for key in ("region_id", "customer_id", "account_name_id", "budget_item_id"):
            if filters.get(key) not in (None, "", []):
                q = q.filter(getattr(Income, key) == filters[key])

        # --- Status list ---
        if filters.get("status"):
            statuses = _coerce_status_list(filters["status"].split(","))
            if statuses:
                q = q.filter(Income.status.in_(statuses))

        # --- Sorting (allowlist) ---
        valid_sort = {
            "issue_date": Income.issue_date,
            "due_date": Income.due_date,
            "invoice_number": Income.invoice_number,
            "total_amount": Income.total_amount,
            "received_amount": Income.received_amount,
            "status": Income.status,
        }
        col = valid_sort.get(sort_by, Income.issue_date)
        order_clause = desc(col) if sort_order == "desc" else asc(col)

        result = q.order_by(order_clause).paginate(page=page, per_page=per_page, error_out=False)
        dinfo("income.list.service", total=result.total, page=page, per_page=per_page)
        return result

    @service_logger
    def get_all_filtered(
        self,
        filters: dict | None = None,
        sort_by: str = "issue_date",
        sort_order: str = "desc",
    ):
        q = Income.query.options(
            joinedload(Income.customer),
            joinedload(Income.region),
            joinedload(Income.account_name),
            joinedload(Income.budget_item),
        )

        filters = filters or {}
        term = (filters.get("search_term") or "").strip()
        if term:
            like = f"%{term.lower()}%"
            q = q.filter(
                func.lower(Income.invoice_name).like(like)
                | func.lower(Income.invoice_number).like(like)
            )

        if filters.get("date_start"):
            q = q.filter(Income.issue_date >= _parse_iso_date(filters["date_start"], "date_start"))
        if filters.get("date_end"):
            q = q.filter(Income.issue_date <= _parse_iso_date(filters["date_end"], "date_end"))

        for key in ("region_id", "customer_id", "account_name_id", "budget_item_id"):
            if filters.get(key) not in (None, "", []):
                q = q.filter(getattr(Income, key) == filters[key])

        if filters.get("status"):
            statuses = _coerce_status_list(filters["status"].split(","))
            if statuses:
                q = q.filter(Income.status.in_(statuses))

        valid_sort = {
            "issue_date": Income.issue_date,
            "due_date": Income.due_date,
            "invoice_number": Income.invoice_number,
            "total_amount": Income.total_amount,
            "received_amount": Income.received_amount,
            "status": Income.status,
        }
        col = valid_sort.get(sort_by, Income.issue_date)
        order_clause = desc(col) if sort_order == "desc" else asc(col)

        rows = q.order_by(order_clause).all()
        dinfo("income.list_all.service", count=len(rows))
        return rows

    @service_logger
    def create(self, income_object: Income) -> Income:
        if not income_object.invoice_number:
            raise AppError("invoice_number is required.", 400)
        if Income.query.filter_by(invoice_number=income_object.invoice_number).first():
            raise AppError(f"Fatura Numarası '{income_object.invoice_number}' zaten mevcut.", 409)

        # Varsayılan başlangıç değeri
        income_object.status = IncomeStatus.UNRECEIVED
        income_object.received_amount = income_object.received_amount or Decimal("0.00")

        dinfo("income.create.validated", invoice=income_object.invoice_number)
        return income_object

    @service_logger
    def get_report_pivot_data(self, year: int, month: int):
        """
        Aylık Tahsilat Raporu (pivot + KPI). Ay başlangıcı dahil, bir sonraki ay başlangıcı hariç.
        """
        try:
            start_date = date(year, month, 1)
            next_month = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
        except ValueError:
            raise AppError("Geçersiz yıl veya ay.", 400)

        # KPIs
        total_invoiced_q = (
            db.session.query(Income.currency, func.sum(Income.total_amount))
            .filter(Income.issue_date >= start_date, Income.issue_date < next_month)
            .group_by(Income.currency)
            .all()
        )
        total_received_q = (
            db.session.query(IncomeReceipt.currency, func.sum(IncomeReceipt.receipt_amount))
            .filter(IncomeReceipt.receipt_date >= start_date, IncomeReceipt.receipt_date < next_month)
            .group_by(IncomeReceipt.currency)
            .all()
        )
        remaining_q = (
            db.session.query(Income.currency, func.sum(Income.remaining_amount))
            .filter(Income.status != IncomeStatus.RECEIVED)
            .group_by(Income.currency)
            .all()
        )

        def _fmt(q):
            return {currency.name: float(amount or 0) for currency, amount in q}

        kpis = {
            "total_invoiced": _fmt(total_invoiced_q),
            "total_received": _fmt(total_received_q),
            "remaining": _fmt(remaining_q),
            "customer_count": db.session.query(
                func.count(func.distinct(Income.customer_id))
            )
            .select_from(IncomeReceipt)
            .join(Income, IncomeReceipt.income_id == Income.id)
            .filter(IncomeReceipt.receipt_date >= start_date, IncomeReceipt.receipt_date < next_month)
            .scalar()
            or 0,
        }

        # Pivot: müşteri x gün x para birimi
        pivot_rows = (
            db.session.query(
                Customer.name,
                extract("day", IncomeReceipt.receipt_date).label("day"),
                IncomeReceipt.currency,
                func.sum(IncomeReceipt.receipt_amount).label("daily_sum"),
            )
            .join(Income, IncomeReceipt.income_id == Income.id)
            .join(Customer, Income.customer_id == Customer.id)
            .filter(IncomeReceipt.receipt_date >= start_date, IncomeReceipt.receipt_date < next_month)
            .group_by(Customer.name, extract("day", IncomeReceipt.receipt_date), IncomeReceipt.currency)
            .order_by(Customer.name)
            .all()
        )

        pivot = defaultdict(lambda: {
            "customer_name": "",
            "daily_totals": defaultdict(lambda: defaultdict(float)),
            "monthly_total": defaultdict(float),
        })
        for cname, day, ccy, daily_sum in pivot_rows:
            item = pivot[cname]
            item["customer_name"] = cname
            amount = float(daily_sum or 0)
            item["daily_totals"][str(int(day))][ccy.name] += amount
            item["monthly_total"][ccy.name] += amount

        data = {"kpis": kpis, "pivot_data": list(pivot.values())}
        dinfo("income.report.monthly_pivot", month=f"{year:04d}-{month:02d}",
              kpis=len(kpis), customers=len(data["pivot_data"]))
        return data


# =========================== Income Receipts =========================

class IncomeReceiptService:
    @staticmethod
    @service_logger
    def _recalculate_income_state(income: Income):
        # Sadece faturanın para birimindeki tahsilatları topluyoruz
        total_received = (
            db.session.query(func.sum(IncomeReceipt.receipt_amount))
            .filter(IncomeReceipt.income_id == income.id,
                    IncomeReceipt.currency == income.currency)
            .scalar()
            or Decimal("0.00")
        )
        income.received_amount = total_received

        latest_receipt = (
            IncomeReceipt.query
            .filter_by(income_id=income.id)
            .order_by(db.desc(IncomeReceipt.receipt_date))
            .first()
        )
        income.last_receipt_date = latest_receipt.receipt_date if latest_receipt else None

        # Durum & zamanlama
        if total_received >= (income.total_amount or Decimal("0.00")):
            income.status = IncomeStatus.RECEIVED
            if income.due_date and latest_receipt:
                if latest_receipt.receipt_date > income.due_date:
                    income.timeliness_status = PaymentTimelinessStatus.LATE
                elif latest_receipt.receipt_date < income.due_date:
                    income.timeliness_status = PaymentTimelinessStatus.EARLY
                else:
                    income.timeliness_status = PaymentTimelinessStatus.ON_TIME
            else:
                income.timeliness_status = None
        elif total_received > 0:
            income.status = IncomeStatus.PARTIALLY_RECEIVED
            income.timeliness_status = None
        else:
            income.status = IncomeStatus.UNRECEIVED
            income.timeliness_status = None

        dinfo("income.receipt.recalc",
              income_id=income.id,
              total_received=float(total_received),
              status=income.status.name)

    @service_logger
    def create(self, income_id: int, receipt_object: IncomeReceipt) -> Income:
        try:
            # Satırı kilitle, yarış koşullarını azalt
            inc = Income.query.with_for_update().get(income_id)
            if not inc:
                raise AppError(f"Gelir ID {income_id} bulunamadı.", 404)

            # Basit alan kontrolleri
            if receipt_object.receipt_amount is None:
                raise AppError("receipt_amount is required.", 400)
            if receipt_object.currency is None:
                raise AppError("currency is required.", 400)

            receipt_object.income_id = inc.id
            db.session.add(receipt_object)
            db.session.flush()  # id oluşsun

            self._recalculate_income_state(inc)
            db.session.commit()

            dinfo("receipt.create.committed",
                  income_id=income_id,
                  receipt_id=receipt_object.id,
                  amount=float(receipt_object.receipt_amount))
            return inc
        except AppError:
            db.session.rollback()
            raise
        except Exception as e:
            db.session.rollback()
            derr("receipt.create.unhandled", err=e, income_id=income_id)
            raise AppError(f"Tahsilat oluşturulurken beklenmedik bir hata: {e}", 500) from e

