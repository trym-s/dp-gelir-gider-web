from .models import db, CreditCard, CreditCardTransaction, CardBrand
from app.payment_type.models import PaymentType

def get_all_card_brands():
    return CardBrand.query.all()

def create_card_brand(data):
    brand = CardBrand(**data)
    db.session.add(brand)
    db.session.commit()
    return brand

def get_all_credit_cards():
    return CreditCard.query.all()

def get_credit_card_by_id(card_id):
    return CreditCard.query.get(card_id)

def create_credit_card(data):
    new_payment_type = PaymentType(
        name=f"Kredi Kartı - {data.get('name')}",
        region_id=data.get('region_id', None) 
    )
    db.session.add(new_payment_type)
    db.session.flush()

    data['payment_type_id'] = new_payment_type.id

    credit_card = CreditCard(**data)
    db.session.add(credit_card)
    db.session.commit()
    return credit_card

def update_credit_card(card_id, data):
    card = CreditCard.query.get(card_id)
    if not card:
        return None
    
    for key, value in data.items():
        setattr(card, key, value)
        
    db.session.commit()
    return card

def add_transaction_to_card(card_id, data):
    card = get_credit_card_by_id(card_id)
    if not card:
        return None
    
    transaction = CreditCardTransaction(credit_card_id=card_id, **data)
    db.session.add(transaction)
    db.session.commit()
    return transaction

def get_transactions_for_card(card_id):
    return CreditCardTransaction.query.filter_by(credit_card_id=card_id).all()