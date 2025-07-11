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
    if region:
        for key, value in data.items():
            setattr(region, key, value)
        db.session.commit()
    return region

def delete(region_id):
    region = Region.query.get(region_id)
    if region:
        db.session.delete(region)
        db.session.commit()
    return region