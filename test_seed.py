from app import create_app, db
from app.models import Region, PaymentType, AccountName, BudgetItem, ExpenseGroup, Expense
from datetime import datetime
from decimal import Decimal
from sqlalchemy import text

app = create_app()

with app.app_context():
    # 🔴 1. Tabloları truncate et
    print("Cleaning existing data...")

    # MSSQL truncate with identity reset
    table_names = [
        'expense', 'expense_group', 'budget_item', 'account_name', 'payment_type', 'region'
    ]
    for table in table_names:
        db.session.execute(text(f"DELETE FROM {table}"))
        db.session.execute(text(f"DBCC CHECKIDENT ('{table}', RESEED, 0)"))

    db.session.commit()
    print("Tables truncated.")

    # 🔷 2. Region insert
    regions = []
    for i in range(1, 4):
        r = Region(name=f"Region {i}")
        db.session.add(r)
        regions.append(r)
    db.session.commit()

    # 🔷 3. PaymentType insert
    payment_types = []
    for i, region in enumerate(regions, start=1):
        pt = PaymentType(name=f"PaymentType {i}", region_id=region.id)
        db.session.add(pt)
        payment_types.append(pt)
    db.session.commit()

    # 🔷 4. AccountName insert
    account_names = []
    for i, pt in enumerate(payment_types, start=1):
        for j in range(2):  # 2 account per payment_type
            an = AccountName(name=f"AccountName {i}-{j+1}", payment_type_id=pt.id)
            db.session.add(an)
            account_names.append(an)
    db.session.commit()

    # 🔷 5. BudgetItem insert
    budget_items = []
    for i, an in enumerate(account_names, start=1):
        bi = BudgetItem(name=f"BudgetItem {i}", account_name_id=an.id)
        db.session.add(bi)
        budget_items.append(bi)
    db.session.commit()

    # 🔷 6. ExpenseGroup insert
    expense_groups = []
    for i in range(1, 4):
        eg = ExpenseGroup(name=f"ExpenseGroup {i}", created_at=datetime.utcnow())
        db.session.add(eg)
        expense_groups.append(eg)
    db.session.commit()

    # 🔷 7. Expense insert
    for i in range(1, 11):
        expense = Expense(
            group_id=expense_groups[i % len(expense_groups)].id,
            region_id=regions[i % len(regions)].id,
            payment_type_id=payment_types[i % len(payment_types)].id,
            account_name_id=account_names[i % len(account_names)].id,
            budget_item_id=budget_items[i % len(budget_items)].id,
            description=f"Test Expense {i}",
            date=datetime.utcnow(),
            amount=Decimal("100.00") + i,
            status=i % 3
        )
        db.session.add(expense)
    db.session.commit()

    print("Test data inserted successfully.")
