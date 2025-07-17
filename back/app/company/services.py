from app.models import Company, db

def get_all():
    return Company.query.all()

def get_by_id(company_id):
    return Company.query.get(company_id)

def create(data):
    company = Company(**data)
    db.session.add(company)
    db.session.commit()
    return company

def update(company_id, data):
    company = Company.query.get(company_id)
    if not company:
        return None
    
    new_name = data.get('name')
    if new_name:
        company.name = new_name
        
    db.session.commit()
    return company

def delete(company_id):
    company = Company.query.get(company_id)
    if company:
        db.session.delete(company)
        db.session.commit()
    return company
