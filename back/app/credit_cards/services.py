
from .models import db, CreditCard, CreditCardTransaction, CardBrand,DailyCreditCardLimit
from app.payment_type.models import PaymentType
from app.banks.models import Bank, BankAccount, StatusHistory
from app.banks.services import save_status as generic_save_status
from datetime import date, timedelta, datetime
from sqlalchemy.orm import joinedload, aliased
from sqlalchemy import func, exc
from typing import Union
from decimal import Decimal

def _parse_date_string(date_str: str) -> date:
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return datetime.strptime(date_str, '%d.%m.%Y').date()

def _to_decimal(value) -> Union[Decimal, None]:
    if value is None or str(value).strip() == '':
        return None
    return Decimal(str(value))

def get_all_card_brands():
    return CardBrand.query.all()

def create_card_brand(data):
    brand = CardBrand(**data)
    db.session.add(brand)
    db.session.commit()
    return brand

def get_all_credit_cards():
    """
    Tüm kredi kartlarını, her birinin en güncel durumu ile birlikte getirir.
    GÜNCEL DURUMU GETİRME SORUNUNU ÇÖZEN KOD BUDUR.
    """
    
    # StatusHistory tablosu için bir "alias" (takma ad) oluşturuyoruz.
    sh_alias = aliased(StatusHistory)
    
    # Her bir kredi kartı (subject_id) için en son durum kaydının ID'sini bulan bir alt sorgu (subquery) oluşturuyoruz.
    # En son eklenen kaydın ID'si en büyük olacağı için max(id) kullanıyoruz.
    latest_status_subquery = db.session.query(
        func.max(sh_alias.id)
    ).filter(
        sh_alias.subject_type == 'credit_card'
    ).group_by(
        sh_alias.subject_id
    ).as_scalar()

    # Ana sorgumuzu oluşturuyoruz:
    # CreditCard tablosunu, StatusHistory tablosu ile LEFT JOIN ile birleştiriyoruz.
    # Join koşulu olarak, StatusHistory kaydının ID'sinin "en son durum kaydı ID'leri" listesinde olmasını sağlıyoruz.
    credit_cards_with_status = db.session.query(
        CreditCard,
        StatusHistory.status,
        StatusHistory.start_date  # <--- HATA VEREN EKSİK SATIR BUYDU
    ).outerjoin(
        StatusHistory, 
        (CreditCard.id == StatusHistory.subject_id) & 
        (StatusHistory.subject_type == 'credit_card') &
        (StatusHistory.id.in_(latest_status_subquery))
    ).all()
    
    # Sorgu sonucu (CreditCard, status) şeklinde bir tuple listesi döner.
    # Bunu, her CreditCard objesine .status özelliğini ekleyerek düz bir listeye çeviriyoruz.
    results = []
    for card, status, start_date in credit_cards_with_status:
        # Eğer kart için hiç durum kaydı yoksa, varsayılan olarak 'Aktif' atıyoruz.
        card.status = status if status else 'Aktif'
        card.status_start_date = start_date
        results.append(card)
        
    return results

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
    """
    ### DEĞİŞİKLİK ###
    Bir kredi kartının alanlarını veya durumunu günceller.
    """
    card = CreditCard.query.get(card_id)
    if not card:
        return None

    # Durum güncellemesi için özel mantık
    if 'status' in data and 'start_date' in data:
        status_data = {
            'subject_id': card_id,
            'subject_type': 'credit_card',
            'status': data['status'],
            'start_date': data['start_date']
        }
        generic_save_status(status_data) # Merkezi status kaydetme fonksiyonunu çağır
        # 'status' ve 'start_date' anahtarlarını data'dan çıkararak aşağıdaki döngüde tekrar işlenmesini engelle
        data.pop('status', None)
        data.pop('start_date', None)

    # Diğer alanları dinamik olarak güncelle
    for key, value in data.items():
        # Güvenlik için sadece modelde var olan alanları güncelle
        if hasattr(card, key):
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
            'type': tx_data.get('type', 'EXPENSE'),
            'bill_id': tx_data.get('bill_id')
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

def get_card_brand_by_id(brand_id):
    return CardBrand.query.get(brand_id)

def update_card_brand(brand_id, data):
    brand = get_card_brand_by_id(brand_id)
    if not brand:
        return None
    brand.name = data.get('name', brand.name)
    db.session.commit()
    return brand

def delete_card_brand(brand_id):
    brand = get_card_brand_by_id(brand_id)
    if brand:
        db.session.delete(brand)
        db.session.commit()
        return True
    return False

def delete_credit_card(card_id):
    card = get_credit_card_by_id(card_id)
    if card:
        db.session.delete(card)
        db.session.commit()
        return True
    return False

def update_transaction(transaction_id, data):
    transaction = CreditCardTransaction.query.get(transaction_id)
    if not transaction:
        return None
    for key, value in data.items():
        setattr(transaction, key, value)
    db.session.commit()
    return transaction

def delete_transaction(transaction_id):
    transaction = CreditCardTransaction.query.get(transaction_id)
    if transaction:
        db.session.delete(transaction)
        db.session.commit()
        return True
    return False

def get_transactions_by_bill_id(bill_id: str):
    return CreditCardTransaction.query.filter_by(bill_id=bill_id).all()

def get_all_billed_transactions():
    return CreditCardTransaction.query.filter(CreditCardTransaction.bill_id.isnot(None)).all()

def get_daily_limits_for_month(year: int, month: int):
    # Bu fonksiyonun implementasyonu DailyLimit modeline bağlı olacaktır.
    # Şimdilik boş bırakıyorum.
    return []

def save_daily_limits(entries_data: list):
    # Bu fonksiyonun implementasyonu DailyLimit modeline bağlı olacaktır.
    # Şimdilik boş bırakıyorum.
    return {"message": "Daily limits saved successfully."}

def get_daily_limits_for_month(year: int, month: int):
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    limits = DailyCreditCardLimit.query.options(
        joinedload(DailyCreditCardLimit.credit_card).joinedload(CreditCard.bank_account).joinedload(BankAccount.bank)
    ).filter(
        DailyCreditCardLimit.entry_date.between(start_date, end_date)
    ).order_by(DailyCreditCardLimit.entry_date).all()
    
    result_data = []
    for limit in limits:
        if limit.credit_card and limit.credit_card.bank_account and limit.credit_card.bank_account.bank:
            limit_dict = {
                'id': limit.id,
                'credit_card_id': limit.credit_card_id,
                'entry_date': limit.entry_date.isoformat(),
                'morning_limit': str(limit.morning_limit) if limit.morning_limit is not None else None,
                'evening_limit': str(limit.evening_limit) if limit.evening_limit is not None else None,
                'bank_name': limit.credit_card.bank_account.bank.name,
                'card_name': limit.credit_card.name
            }
            result_data.append(limit_dict)
    return result_data

def save_daily_limits(entries_data: list):
    if not entries_data:
        raise ValueError("Giriş verisi boş olamaz.")
    try:
        entries_by_card_key = {}
        for entry in entries_data:
            # DÜZELTME: Gruplama anahtarı olarak card_id'yi kullanmak daha güvenli
            key = entry.get('credit_card_id')
            if not key: continue
            if key not in entries_by_card_key: entries_by_card_key[key] = []
            entries_by_card_key[key].append(entry)

        for card_id, entries in entries_by_card_key.items():
            card = CreditCard.query.get(card_id)
            if not card: continue

            sorted_entries = sorted(entries, key=lambda x: _parse_date_string(x['tarih']))
            
            for entry_data in sorted_entries:
                submission_date = _parse_date_string(entry_data['tarih'])
                
                last_record = DailyCreditCardLimit.query.filter(
                    DailyCreditCardLimit.credit_card_id == card_id,
                    DailyCreditCardLimit.entry_date < submission_date
                ).order_by(DailyCreditCardLimit.entry_date.desc()).first()

                fill_value = card.limit
                if last_record:
                    fill_value = last_record.evening_limit if last_record.evening_limit is not None else last_record.morning_limit
                    if last_record.evening_limit is None and fill_value is not None:
                        last_record.evening_limit = fill_value
                        db.session.add(last_record)

                if last_record and fill_value is not None:
                    gap_date = last_record.entry_date + timedelta(days=1)
                    while gap_date < submission_date:
                        existing_gap = DailyCreditCardLimit.query.filter_by(credit_card_id=card_id, entry_date=gap_date).first()
                        if not existing_gap:
                            db.session.add(DailyCreditCardLimit(
                                credit_card_id=card_id, entry_date=gap_date,
                                morning_limit=fill_value, evening_limit=fill_value
                            ))
                        gap_date += timedelta(days=1)
                
                sabah_input = _to_decimal(entry_data.get('sabah'))
                aksam_input = _to_decimal(entry_data.get('aksam'))
                existing_entry = DailyCreditCardLimit.query.filter_by(credit_card_id=card_id, entry_date=submission_date).first()

                if existing_entry:
                    if sabah_input is not None: existing_entry.morning_limit = sabah_input
                    if 'aksam' in entry_data: existing_entry.evening_limit = aksam_input
                else:
                    final_sabah = sabah_input
                    if final_sabah is None: final_sabah = fill_value
                    db.session.add(DailyCreditCardLimit(
                        credit_card_id=card_id, entry_date=submission_date,
                        morning_limit=final_sabah, evening_limit=aksam_input
                    ))
        
        db.session.commit()
        return {"message": "Günlük limitler başarıyla kaydedildi."}
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Limitler kaydedilirken bir hata oluştu: {e}")
