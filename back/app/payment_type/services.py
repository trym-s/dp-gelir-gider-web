from app.models import PaymentType, db

def get_all():
    payment_types = PaymentType.query.all()
    return [pt.to_dict() for pt in payment_types]

def create(data):
    payment_type = PaymentType(**data)
    db.session.add(payment_type)
    db.session.commit()
    return payment_type.to_dict()

def update(payment_type_id, data):
    payment_type = PaymentType.query.get(payment_type_id)
    if payment_type:
        for key, value in data.items():
            setattr(payment_type, key, value)
        db.session.commit()
    return payment_type

def delete(payment_type_id):
    payment_type = PaymentType.query.get(payment_type_id)
    if payment_type:
        db.session.delete(payment_type)
        db.session.commit()
    return payment_type
