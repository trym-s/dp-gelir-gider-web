from app.models import BudgetItem, db

def get_all():
    return BudgetItem.query.all()

def create(data):
    budget_item = BudgetItem(**data)
    db.session.add(budget_item)
    db.session.commit()
    return budget_item.to_dict()

def update(budget_item_id, data):
    budget_item = BudgetItem.query.get(budget_item_id)
    if budget_item:
        for key, value in data.items():
            setattr(budget_item, key, value)
        db.session.commit()
    return budget_item

def delete(budget_item_id):
    budget_item = BudgetItem.query.get(budget_item_id)
    if budget_item:
        db.session.delete(budget_item)
        db.session.commit()
    return budget_item