from sqlalchemy import func, asc, desc
from sqlalchemy.orm import joinedload
from app.models import Income, Region, AccountName, BudgetItem, Company, db, IncomeGroup, IncomeStatus
from datetime import datetime
from dateutil.relativedelta import relativedelta

def get_all(filters=None, sort_by=None, sort_order='asc', page=1, per_page=20):
    query = Income.query.options(
        joinedload(Income.region),
        joinedload(Income.account_name),
        joinedload(Income.budget_item),
        joinedload(Income.company),
        joinedload(Income.group)
    )

    if filters:
        filter_map = {
            'region_id': Income.region_id,
            'account_name_id': Income.account_name_id,
            'budget_item_id': Income.budget_item_id,
            'company_id': Income.company_id,
            'status': Income.status,
            'description': Income.description,
            'total_amount_min': Income.total_amount,
            'total_amount_max': Income.total_amount,
            'date_start': Income.date,
            'date_end': Income.date
        }

        for key, value in filters.items():
            if value is None or value == '':
                continue
            if key not in filter_map:
                continue
            column = filter_map[key]

            if key == 'status':
                if isinstance(value, str) and ',' in value:
                    statuses = [s.strip().upper() for s in value.split(',')]
                    query = query.filter(Income.status.in_(statuses))
                else:
                    query = query.filter(column == value)
            elif key.endswith('_min'):
                query = query.filter(column >= value)
            elif key.endswith('_max'):
                query = query.filter(column <= value)
            elif key.endswith('_start'):
                query = query.filter(column >= datetime.fromisoformat(value))
            elif key.endswith('_end'):
                query = query.filter(column <= datetime.fromisoformat(value))
            elif key == 'description':
                query = query.filter(func.lower(column).like(f"%{value.lower()}%" ))
            else:
                query = query.filter(column == value)

    valid_sort_columns = {
        'date': Income.date,
        'total_amount': Income.total_amount,
        'remaining_amount': Income.remaining_amount,
        'description': Income.description,
        'status': Income.status
    }

    if sort_by and sort_by in valid_sort_columns:
        column = valid_sort_columns[sort_by]
        if sort_order == 'desc':
            query = query.order_by(desc(column))
        else:
            query = query.order_by(asc(column))

    return query.paginate(page=page, per_page=per_page, error_out=False)

def get_by_id(income_id):
    return Income.query.options(
        joinedload(Income.region),
        joinedload(Income.account_name),
        joinedload(Income.budget_item),
        joinedload(Income.company),
        joinedload(Income.group)
    ).get(income_id)

def create(income: Income):
    db.session.add(income)
    db.session.commit()
    return income

def update(income_id, data):
    income = Income.query.get(income_id)
    if not income:
        return None
    for key, value in data.items():
        if hasattr(income, key):
            setattr(income, key, value)
    db.session.commit()
    return income

def delete(income_id):
    income = Income.query.get(income_id)
    if income:
        db.session.delete(income)
        db.session.commit()
    return income

def create_income_group_with_incomes(group_name, income_template_data, repeat_count):
    group = IncomeGroup(name=group_name, created_at=datetime.utcnow())
    db.session.add(group)
    db.session.flush()

    base_date = datetime.strptime(income_template_data['date'], '%Y-%m-%d')
    incomes = []

    for i in range(repeat_count):
        income_date = base_date + relativedelta(months=i)
        income = Income(
            group_id=group.id,
            region_id=income_template_data['region_id'],
            account_name_id=income_template_data['account_name_id'],
            budget_item_id=income_template_data['budget_item_id'],
            company_id=income_template_data['company_id'],
            description=f"{income_template_data['description']} ({i+1}/{repeat_count})",
            date=income_date,
            total_amount=income_template_data['total_amount'],
            status=IncomeStatus.UNRECEIVED
        )
        db.session.add(income)
        incomes.append(income)

    db.session.commit()
    return {"income_group": group, "incomes": incomes}

def get_income_pivot(month_str):
    year, month = map(int, month_str.split("-"))
    start_date = datetime(year, month, 1)
    end_date = start_date + relativedelta(months=1)

    results = db.session.query(
        Income.id,
        Income.date,
        Income.total_amount,
        Income.description,
        Region.id.label("region_id"),
        Region.name.label("region_name"),
        BudgetItem.id.label("budget_item_id"),
        BudgetItem.name.label("budget_item_name")
    ).join(Region, Region.id == Income.region_id)      .join(BudgetItem, BudgetItem.id == Income.budget_item_id)      .filter(Income.date >= start_date, Income.date < end_date).all()
    
    return results
