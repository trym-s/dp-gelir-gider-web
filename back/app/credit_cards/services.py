from .models import db, CreditCard, CreditCardTransaction, CardBrand
from app.payment_type.models import PaymentType
from app.banks.models import Bank, BankAccount
from datetime import datetime
from sqlalchemy.orm import joinedload

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

def bulk_add_transactions_to_card(card_id, transactions_data):
    """
    Bir kredi kartına toplu olarak harcama işlemleri ekler.
    (Geçici olarak user_id kontrolü kaldırıldı.)
    """
    # GÜVENLİK KONTROLÜ GEÇİCİ OLARAK KALDIRILDI
    card = CreditCard.query.filter_by(id=card_id).first()
    if not card:
        raise ValueError("Credit card not found.")

    new_transactions_mappings = []
    for tx_data in transactions_data:
        new_transactions_mappings.append({
            'credit_card_id': card.id,
            'amount': tx_data.get('amount'),
            'description': tx_data.get('description'),
            'transaction_date': datetime.strptime(tx_data.get('transaction_date'), '%Y-%m-%d').date(),
            'type': tx_data.get('type', 'EXPENSE')
        })

    if not new_transactions_mappings:
        return []

    db.session.bulk_insert_mappings(CreditCardTransaction, new_transactions_mappings)
    
    return new_transactions_mappings

def get_credit_cards_grouped_by_bank():
    """
    Tüm kredi kartlarını, ilişkili oldukları bankalara göre gruplayarak döner.
    Her banka için, o bankaya ait kredi kartlarının bir listesini içerir.
    """
    credit_cards = CreditCard.query.all()

    grouped_cards = {}
    for card in credit_cards:
        bank_name = card.bank_account.bank.name
        if bank_name not in grouped_cards:
            grouped_cards[bank_name] = []
        grouped_cards[bank_name].append(card)
    
    return grouped_cards