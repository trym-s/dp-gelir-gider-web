from sqlalchemy import func,asc,desc
from sqlalchemy.orm import joinedload
from app.models import Expense, Region, PaymentType, AccountName, BudgetItem, db, ExpenseGroup, ExpenseStatus
from datetime import datetime
from dateutil.relativedelta import relativedelta


def get_all(filters=None, sort_by=None, sort_order='asc', page=1, per_page=20):
    query = Expense.query.options(
        joinedload(Expense.region),
        joinedload(Expense.payment_type),
        joinedload(Expense.account_name),
        joinedload(Expense.budget_item),
        joinedload(Expense.group)
    )

    # 🔷 Filtering
    if filters:
        if filters.get('is_grouped') == 'true':
            query = query.filter(Expense.group_id.isnot(None))
        
        if filters.get('group_id'):
            query = query.filter(Expense.group_id == filters.get('group_id'))

        filter_map = {
            'region_id': Expense.region_id,
            'payment_type_id': Expense.payment_type_id,
            'account_name_id': Expense.account_name_id,
            'budget_item_id': Expense.budget_item_id,
            'status': Expense.status,
            'description': Expense.description,
            'amount_min': Expense.amount,
            'amount_max': Expense.amount,
            'date_start': Expense.date,
            'date_end': Expense.date
        }

        for key, value in filters.items():
            if value is None or value == '':
                continue

            if key not in filter_map:
                continue

            column = filter_map[key]

            if key in ['region_id', 'payment_type_id', 'account_name_id', 'budget_item_id', 'status']:
                if isinstance(value, str) and ',' in value:
                    values = [v.strip() for v in value.split(',')]
                    if key != 'status':
                        values = [int(v) for v in values if v.isdigit()]
                    query = query.filter(column.in_(values))
                else:
                    query = query.filter(column == value)
            elif key.endswith('_min'):
                query = query.filter(column >= value)
            elif key.endswith('_max'):
                query = query.filter(column <= value)
            elif key.endswith('_start'):
                try:
                    start_date = datetime.fromisoformat(value)
                    query = query.filter(column >= start_date)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid date format for {key}. Use ISO format (YYYY-MM-DD).")
            elif key.endswith('_end'):
                try:
                    end_date = datetime.fromisoformat(value)
                    query = query.filter(column <= end_date)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid date format for {key}. Use ISO format (YYYY-MM-DD).")
            elif key == 'description':
                query = query.filter(func.lower(column).like(f"%{value.lower()}%"))
            else:
                query = query.filter(column == value)

    valid_sort_columns = {
        'date': Expense.date,
        'amount': Expense.amount,
        'remaining_amount': Expense.remaining_amount,
        'description': Expense.description,
        'status': Expense.status
    }

    if sort_by:
        column = valid_sort_columns.get(sort_by)
        if column is not None:
            if sort_order == 'desc':
                query = query.order_by(desc(column))
            else:
                query = query.order_by(asc(column))
        else:
            raise ValueError(f"Unsupported sort_by field: {sort_by}")

    return query.paginate(page=page, per_page=per_page, error_out=False)

def get_by_id(expense_id):
    return Expense.query.options(
        joinedload(Expense.region),
        joinedload(Expense.payment_type),
        joinedload(Expense.account_name),
        joinedload(Expense.budget_item),
        joinedload(Expense.group)
    ).get(expense_id)

def create(expense: Expense):
    db.session.add(expense)
    db.session.commit()
    return expense

from decimal import Decimal

def update(expense_id, data):
    expense = Expense.query.get(expense_id)
    if not expense:
        return None

    # İzin verilen alanların bir listesini tanımla
    allowed_fields = [
        'description', 'amount', 'date', 
        'region_id', 'payment_type_id', 'account_name_id', 'budget_item_id'
    ]

    for field in allowed_fields:
        if field in data:
            value = data[field]
            # Tarih alanı için özel dönüşüm
            if field == 'date' and isinstance(value, str):
                try:
                    value = datetime.fromisoformat(value).date()
                except ValueError:
                    # Hatalı formatta tarih gelirse, bu alanı atla veya hata fırlat
                    # Şimdilik atlamayı tercih edelim
                    continue
            # Tutar alanı için Decimal dönüşümü
            if field == 'amount':
                try:
                    value = Decimal(value)
                except (ValueError, TypeError):
                    continue # Hatalı formatta ise atla
            
            setattr(expense, field, value)

    # Değişiklikleri veritabanına kaydet
    db.session.commit()
    return expense

def delete(expense_id):
    expense = Expense.query.get(expense_id)
    if expense:
        db.session.delete(expense)
        db.session.commit()
    return expense

def create_expense_group_with_expenses(group_name, expense_template_data, repeat_count):
    group = ExpenseGroup(name=group_name, created_at=datetime.utcnow())
    db.session.add(group)
    db.session.flush()

    base_date = datetime.utcnow()
    expenses = []

    for i in range(repeat_count):
        expense_date = base_date + relativedelta(months=i)
        expense = Expense(
            group_id=group.id,
            region_id=expense_template_data['region_id'],
            payment_type_id=expense_template_data['payment_type_id'],
            account_name_id=expense_template_data['account_name_id'],
            budget_item_id=expense_template_data['budget_item_id'],
            description=f"{expense_template_data['description']} ({i+1}/{repeat_count})",
            date=expense_date,
            amount=expense_template_data['amount'],
            remaining_amount=expense_template_data['amount'],  # ilk başta kalan amount = amount
            status=ExpenseStatus.UNPAID.name
        )
        db.session.add(expense)
        expenses.append(expense)

    db.session.commit()

    return {
        "expense_group": group,
        "expenses": expenses
    }

def get_all_groups():
    return ExpenseGroup.query.order_by(ExpenseGroup.name).all()