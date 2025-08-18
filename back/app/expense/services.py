from flask import logging
from sqlalchemy import func,asc,desc
from sqlalchemy.orm import joinedload
from app import db
from app.expense.models import Expense, ExpenseGroup, ExpenseStatus, ExpenseLine
from app.expense.schemas import ExpenseSchema
from app.region.models import Region
from app.payment_type.models import PaymentType
from app.account_name.models import AccountName
from app.budget_item.models import BudgetItem
from datetime import datetime
from dateutil.relativedelta import relativedelta
from app.account_name.models import AccountName

def get_all(filters=None, sort_by=None, sort_order='asc', page=1, per_page=20):
    query = Expense.query.options(
        joinedload(Expense.region),
        joinedload(Expense.payment_type),
        joinedload(Expense.account_name),
        joinedload(Expense.budget_item),
        joinedload(Expense.group),
        joinedload(Expense.supplier) # Add this line to eager load supplier
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

def create(data):
    """
    Yeni bir gider oluşturur ve bu sırada ilgili hesap adının ödeme gününü günceller.
    Bu işlem tek bir veritabanı oturumunda (atomic) yapılır.
    """
    try:
        # --- 1. Adım: Veri Paketini Güvenli Bir Şekilde Ayıklama ---
        payment_day = data.get('payment_day')
        account_name_id = data.get('account_name_id')
        lines_data = data.pop('lines', [])

        # Gider verisinden 'payment_day'i çıkarıyoruz. Bu en kritik adımdır.
        expense_data = {key: value for key, value in data.items() if key != 'payment_day'}

        # --- 2. Adım: Hesap Adını Güncelleme ---
        if account_name_id and payment_day:
            account = AccountName.query.get(account_name_id)
            if account:
                account.payment_day = payment_day
                db.session.add(account)

        # --- 3. Adım: Yeni Gideri Oluşturma ---
        schema = ExpenseSchema()
        new_expense = schema.load(expense_data, session=db.session)

        if lines_data:
            for line_data in lines_data:
                new_expense.lines.append(ExpenseLine(**line_data))

        db.session.add(new_expense)

        # --- 4. Adım: Tüm Değişiklikleri Tek Seferde Kaydetme ---
        db.session.commit()

        return schema.dump(new_expense), None

    except Exception as e:
        db.session.rollback()
        logging.error(f"GİDER OLUŞTURMA HATASI: {e}", exc_info=True) 
        return None, "Internal server error"

from decimal import Decimal

def update(expense_id, data):
    """
    Mevcut bir gideri günceller ve bu sırada ilgili hesap adının
    ödeme gününü de günceller.
    """
    # --- 1. Adım: Güncellenecek Gideri Bulma ---
    expense_to_update = Expense.query.get(expense_id)
    if not expense_to_update:
        return None, "Gider bulunamadı"

    try:
        # --- 2. Adım: Hesap Adı'nın Ödeme Gününü Güncelleme ---
        payment_day = data.get('payment_day')
        account_name_id = data.get('account_name_id')

        if account_name_id and payment_day is not None:
            account = AccountName.query.get(account_name_id)
            if account:
                account.payment_day = payment_day
                db.session.add(account)

        # --- 3. Adım: Gider Verisini Hazırlama ve Güncelleme ---
        # 'payment_day' alanını asıl gider verisinden çıkarıyoruz.
        if 'payment_day' in data:
            del data['payment_day']

        # Kalan verilerle gideri güncelle
        for key, value in data.items():
            if hasattr(expense_to_update, key):
                setattr(expense_to_update, key, value)

        # --- 4. Adım: Tüm Değişiklikleri Kaydetme ---
        db.session.commit()

        schema = ExpenseSchema()
        return schema.dump(expense_to_update), None

    except Exception as e:
        db.session.rollback()
        print(f"GİDER GÜNCELLEME HATASI: {e}")
        return None, "Internal server error"

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



