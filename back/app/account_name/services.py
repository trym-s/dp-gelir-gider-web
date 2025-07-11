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
    if account_name:
        for key, value in data.items():
            setattr(account_name, key, value)
        db.session.commit()
    return account_name

def delete(account_name_id):
    account_name = AccountName.query.get(account_name_id)
    if account_name:
        db.session.delete(account_name)
        db.session.commit()
    return account_name