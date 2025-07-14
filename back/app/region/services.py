from app.models import Region, db

def get_all():
    return Region.query.all()

def create(data):
    region = Region(**data)
    db.session.add(region)
    db.session.commit()
    return region.to_dict()

def update(region_id, data):
    region = Region.query.get(region_id)
    if not region:
        return None
    
    new_name = data.get('name')
    if new_name:
        # Optional: Check for duplicate names if they should be unique
        # if Region.query.filter_by(name=new_name).first():
        #     raise Exception(f"Region with name '{new_name}' already exists.")
        region.name = new_name
        
    db.session.commit()
    return region

def delete(region_id):
    region = Region.query.get(region_id)
    if region:
        db.session.delete(region)
        db.session.commit()
    return region