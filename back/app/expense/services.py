from sqlalchemy import func,asc,desc
from app.models import Expense, Region, PaymentType, AccountName, BudgetItem, db, ExpenseGroup
from datetime import datetime
from dateutil.relativedelta import relativedelta


def get_all(filters=None, sort_by=None, sort_order='asc'):
    query = Expense.query

    # 🔷 Filtering
    if filters:
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
            if value is None:
                continue

            if key not in filter_map:
                continue

            column = filter_map[key]

            if key == 'status':
                # Değer bir dize ise ve virgül içeriyorsa, birden çok durumu işle
                if isinstance(value, str) and ',' in value:
                    statuses = [s.strip().upper() for s in value.split(',')]
                    query = query.filter(Expense.status.in_(statuses))
                else:
                    # Tek bir durumu işle
                    query = query.filter(column == value)
            elif key.endswith('_min'):
                query = query.filter(column >= value)
            elif key.endswith('_max'):
                query = query.filter(column <= value)
            elif key.endswith('_start'):
                try:
                    start_date = datetime.fromisoformat(value)
                    query = query.filter(column >= start_date)
                except ValueError:
                    raise ValueError(f"Invalid date format for {key}. Use ISO format (YYYY-MM-DD).")
            elif key.endswith('_end'):
                try:
                    end_date = datetime.fromisoformat(value)
                    query = query.filter(column <= end_date)
                except ValueError:
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

    return query.all()

def get_by_id(expense_id):
    return Expense.query.get(expense_id)

def create(expense: Expense):
    db.session.add(expense)
    db.session.commit()
    return expense

def update(expense_id, data):
    expense = Expense.query.get(expense_id)
    if not expense:
        return None

    # Validate foreign keys if they are being updated
    if 'region_id' in data and data.get('region_id') is not None and not Region.query.get(data['region_id']):
        raise ValueError("Invalid region_id")
    if 'payment_type_id' in data and data.get('payment_type_id') is not None and not PaymentType.query.get(data['payment_type_id']):
        raise ValueError("Invalid payment_type_id")
    if 'account_name_id' in data and data.get('account_name_id') is not None and not AccountName.query.get(data['account_name_id']):
        raise ValueError("Invalid account_name_id")
    if 'budget_item_id' in data and data.get('budget_item_id') is not None and not BudgetItem.query.get(data['budget_item_id']):
        raise ValueError("Invalid budget_item_id")

    for key, value in data.items():
        setattr(expense, key, value)
    db.session.commit()
    return expense.to_dict()

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
            status=0
        )
        db.session.add(expense)
        expenses.append(expense)

    db.session.commit()

    return {
        "expense_group": group,
        "expenses": expenses
    }