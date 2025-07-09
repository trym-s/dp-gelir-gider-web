from app.models import Region, db

def get_all_regions():
    return Region.query.all()

def create_region(data):
    region = Region(**data)
    db.session.add(region)
    db.session.commit()
    return region

def update_region(region_id, data):
    region = Region.query.get(region_id)
    if region:
        for key, value in data.items():
            setattr(region, key, value)
        db.session.commit()
    return region

def delete_region(region_id):
    region = Region.query.get(region_id)
    if region:
        db.session.delete(region)
        db.session.commit()
    return region
