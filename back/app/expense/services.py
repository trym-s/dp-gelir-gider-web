# app/expense/services.py
from datetime import datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import func, asc, desc
from sqlalchemy.orm import joinedload

from app import db
from app.errors import AppError
from app.logging_decorator import service_logger
from app.logging_utils import dinfo, dwarn, derr, dinfo_sampled  # <- dinfo_sampled eklendi

from app.expense.models import Expense, ExpenseGroup, ExpenseStatus, ExpenseLine
from app.expense.schemas import ExpenseSchema
from app.account_name.models import AccountName


def _parse_iso_dt(v: str, field_name: str) -> datetime:
    try:
        return datetime.fromisoformat(v)
    except Exception:
        raise AppError(f"Invalid date format for {field_name}. Expected YYYY-MM-DD", 400)


class ExpenseService:
    """All DB ops & business logic for Expenses (exception-first)."""

    @service_logger
    def list(self, *, filters=None, sort_by=None, sort_order="asc", page=1, per_page=20):
        q = Expense.query.options(
            joinedload(Expense.region),
            joinedload(Expense.payment_type),
            joinedload(Expense.account_name),
            joinedload(Expense.budget_item),
            joinedload(Expense.group),
            joinedload(Expense.supplier),
        )

        filters = filters or {}
        if filters:
            if filters.get("is_grouped") == "true":
                q = q.filter(Expense.group_id.isnot(None))
            if filters.get("group_id"):
                q = q.filter(Expense.group_id == filters.get("group_id"))

            filter_map = {
                "region_id": Expense.region_id,
                "payment_type_id": Expense.payment_type_id,
                "account_name_id": Expense.account_name_id,
                "budget_item_id": Expense.budget_item_id,
                "status": Expense.status,
                "description": Expense.description,
                "amount_min": Expense.amount,
                "amount_max": Expense.amount,
                "date_start": Expense.date,
                "date_end": Expense.date,
            }

            for key, value in filters.items():
                if value in (None, "") or key not in filter_map:
                    continue

                col = filter_map[key]
                if key in ["region_id", "payment_type_id", "account_name_id", "budget_item_id", "status"]:
                    if isinstance(value, str) and "," in value:
                        vals = [v.strip() for v in value.split(",")]
                        if key != "status":
                            try:
                                vals = [int(v) for v in vals if v != ""]
                            except ValueError:
                                raise AppError(f"Invalid numeric list for {key}", 400)
                        q = q.filter(col.in_(vals))
                    else:
                        q = q.filter(col == value)
                elif key.endswith("_min"):
                    q = q.filter(col >= value)
                elif key.endswith("_max"):
                    q = q.filter(col <= value)
                elif key.endswith("_start"):
                    q = q.filter(col >= _parse_iso_dt(value, key))
                elif key.endswith("_end"):
                    q = q.filter(col <= _parse_iso_dt(value, key))
                elif key == "description":
                    q = q.filter(func.lower(col).like(f"%{value.lower()}%"))
                else:
                    q = q.filter(col == value)

        valid_sort = {
            "date": Expense.date,
            "amount": Expense.amount,
            "remaining_amount": Expense.remaining_amount,
            "description": Expense.description,
            "status": Expense.status,
        }
        if sort_by:
            col = valid_sort.get(sort_by)
            if not col:
                raise AppError(f"Unsupported sort_by field: {sort_by}", 400)
            q = q.order_by(desc(col) if sort_order == "desc" else asc(col))

        page = int(page or 1)
        per_page = int(per_page or 20)
        result = q.paginate(page=page, per_page=per_page, error_out=False)

        # INFO (yüksek frekans) -> sampled
        dinfo_sampled("expense.list",
                      filters=filters, sort_by=sort_by, sort_order=sort_order,
                      page=page, per_page=per_page, total=result.total)
        return result

    @service_logger
    def get_by_id(self, expense_id: int) -> Expense:
        exp = Expense.query.options(
            joinedload(Expense.region),
            joinedload(Expense.payment_type),
            joinedload(Expense.account_name),
            joinedload(Expense.budget_item),
            joinedload(Expense.group),
        ).get(expense_id)
        if not exp:
            raise AppError("Expense not found", 404)

        # Detay GET -> düşük frekans; yine de küçük bir breadcrumb (sampled)
        dinfo_sampled("expense.get", expense_id=expense_id)
        return exp

    @service_logger
    def create(self, data: dict) -> Expense:
        payload = dict(data or {})
        payment_day = payload.get("payment_day")
        account_name_id = payload.get("account_name_id")
        lines_data = payload.pop("lines", [])

        # payment_day Expense modeli alanı değil; shadow alan
        expense_data = {k: v for k, v in payload.items() if k != "payment_day"}

        # ilişkili account_name.payment_day opsiyonel güncelleme
        if account_name_id and payment_day:
            account = AccountName.query.get(account_name_id)
            if not account:
                raise AppError("AccountName not found", 404)
            account.payment_day = payment_day
            db.session.add(account)

        schema = ExpenseSchema()
        new_expense = schema.load(expense_data, session=db.session)

        if lines_data:
            for line_data in lines_data:
                new_expense.lines.append(ExpenseLine(**line_data))

        db.session.add(new_expense)
        db.session.commit()

        # Yazma akışı -> tam log
        dinfo("expense.create.committed", expense_id=new_expense.id,
              account_name_id=account_name_id, has_lines=bool(lines_data))
        return new_expense

    @service_logger
    def update(self, expense_id: int, data: dict) -> Expense:
        exp = Expense.query.get(expense_id)
        if not exp:
            raise AppError("Expense not found", 404)

        payment_day = data.get("payment_day")
        account_name_id = data.get("account_name_id")

        if account_name_id and payment_day is not None:
            account = AccountName.query.get(account_name_id)
            if not account:
                raise AppError("AccountName not found", 404)
            account.payment_day = payment_day
            db.session.add(account)

        # shadow alanı kaldır
        data = dict(data or {})
        data.pop("payment_day", None)

        # scalar patch
        for k, v in data.items():
            if hasattr(exp, k):
                setattr(exp, k, v)

        db.session.commit()
        # Yazma akışı -> tam log
        dinfo("expense.update.committed", expense_id=expense_id)
        return exp

    @service_logger
    def delete(self, expense_id: int):
        exp = Expense.query.get(expense_id)
        if not exp:
            raise AppError("Expense not found", 404)
        db.session.delete(exp)
        db.session.commit()
        # Yazma akışı -> tam log
        dinfo("expense.delete.committed", expense_id=expense_id)
        return {"message": "Expense deleted"}

    @service_logger
    def create_expense_group_with_expenses(self, group_name: str, expense_template_data: dict, repeat_count: int):
        if not group_name or not expense_template_data or not repeat_count:
            raise AppError("group_name, expense_template_data, repeat_count are required", 400)

        # Yazma akışı -> tam log
        dinfo("expense.group.create.start", group_name=group_name, repeat_count=repeat_count)

        group = ExpenseGroup(name=group_name, created_at=datetime.utcnow())
        db.session.add(group)
        db.session.flush()  # group.id için

        base_date = datetime.utcnow()
        expenses = []
        for i in range(int(repeat_count)):
            expense_date = base_date + relativedelta(months=i)
            exp = Expense(
                group_id=group.id,
                region_id=expense_template_data["region_id"],
                payment_type_id=expense_template_data["payment_type_id"],
                account_name_id=expense_template_data["account_name_id"],
                budget_item_id=expense_template_data["budget_item_id"],
                description=f'{expense_template_data["description"]} ({i+1}/{repeat_count})',
                date=expense_date,
                amount=expense_template_data["amount"],
                remaining_amount=expense_template_data["amount"],
                status=ExpenseStatus.UNPAID.name,
            )
            db.session.add(exp)
            expenses.append(exp)

        db.session.commit()
        # Yazma akışı -> tam log
        dinfo("expense.group.create.committed", group_id=group.id, count=len(expenses))
        return {"expense_group": group, "expenses": expenses}

    @service_logger
    def get_all_groups(self):
        rows = ExpenseGroup.query.order_by(ExpenseGroup.name).all()
        # Read-only GET -> sampled
        dinfo_sampled("expense.group.list", count=len(rows))
        return rows

