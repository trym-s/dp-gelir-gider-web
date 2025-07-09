from app.models import BudgetItem, db

def get_all_budget_items():
    return BudgetItem.query.all()

def create_budget_item(data):
    budget_item = BudgetItem(**data)
    db.session.add(budget_item)
    db.session.commit()
    return budget_item

def update_budget_item(budget_item_id, data):
    budget_item = BudgetItem.query.get(budget_item_id)
    if budget_item:
        for key, value in data.items():
            setattr(budget_item, key, value)
        db.session.commit()
    return budget_item

def delete_budget_item(budget_item_id):
    budget_item = BudgetItem.query.get(budget_item_id)
    if budget_item:
        db.session.delete(budget_item)
        db.session.commit()
    return budget_item
