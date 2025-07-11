from app.models import AccountName, db

def get_all():
    return AccountName.query.all()

def create(data):
    account_name = AccountName(**data)
    db.session.add(account_name)
    db.session.commit()
    return account_name.to_dict()

def update(account_name_id, data):
    account_name = AccountName.query.get(account_name_id)
    if not account_name:
        return None
        
    new_name = data.get('name')
    if new_name:
        account_name.name = new_name

    db.session.commit()
    return account_name

def delete(account_name_id):
    account_name = AccountName.query.get(account_name_id)
    if account_name:
        db.session.delete(account_name)
        db.session.commit()
    return account_name