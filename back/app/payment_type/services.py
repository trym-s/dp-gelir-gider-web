from app.models import PaymentType, db

def get_all_payment_types():
    return PaymentType.query.all()

def create_payment_type(data):
    payment_type = PaymentType(**data)
    db.session.add(payment_type)
    db.session.commit()
    return payment_type

def update_payment_type(payment_type_id, data):
    payment_type = PaymentType.query.get(payment_type_id)
    if payment_type:
        for key, value in data.items():
            setattr(payment_type, key, value)
        db.session.commit()
    return payment_type

def delete_payment_type(payment_type_id):
    payment_type = PaymentType.query.get(payment_type_id)
    if payment_type:
        db.session.delete(payment_type)
        db.session.commit()
    return payment_type