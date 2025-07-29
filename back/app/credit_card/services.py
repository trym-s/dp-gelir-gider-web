# app/credit_card/services.py

from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import func, exc
from sqlalchemy.orm import joinedload
from app import db
from app.models import Account, CreditCard, CardBrand, DailyCreditCardLimit, StatusHistory, Bank
from .schemas import daily_limits_schema, card_brands_schema, card_brand_schema
from typing import Union

# --- Yardımcı Fonksiyonlar ---
def _parse_date_string(date_str: str) -> date:
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return datetime.strptime(date_str, '%d.%m.%Y').date()

def _to_decimal(value) -> Union[Decimal, None]:
    if value is None or str(value).strip() == '':
        return None
    return Decimal(str(value))

# --- Servis Fonksiyonları ---

def get_all_credit_cards():
    """Tüm Kredi Kartlarını, en son sabah/akşam limitleriyle birlikte getirir."""
    today = date.today()

    latest_limit_subquery = db.session.query(
        DailyCreditCardLimit.credit_card_id,
        DailyCreditCardLimit.morning_limit,
        DailyCreditCardLimit.evening_limit,
        func.row_number().over(
            partition_by=DailyCreditCardLimit.credit_card_id,
            order_by=DailyCreditCardLimit.entry_date.desc()
        ).label('rn')
    ).subquery()

    latest_status_subquery = db.session.query(
        StatusHistory.subject_id,
        StatusHistory.status,
        func.row_number().over(
            partition_by=StatusHistory.subject_id,
            order_by=StatusHistory.start_date.desc()
        ).label('rn')
    ).filter(
        StatusHistory.subject_type == 'credit_card',
        StatusHistory.start_date <= today
    ).subquery()

    query_result = db.session.query(
        CreditCard,
        latest_limit_subquery.c.morning_limit,
        latest_limit_subquery.c.evening_limit,
        latest_status_subquery.c.status
    ).outerjoin(
        latest_limit_subquery,
        (CreditCard.id == latest_limit_subquery.c.credit_card_id) & (latest_limit_subquery.c.rn == 1)
    ).outerjoin(
        latest_status_subquery,
        (CreditCard.id == latest_status_subquery.c.subject_id) & (latest_status_subquery.c.rn == 1)
    ).options(
        joinedload(CreditCard.account).joinedload(Account.bank),
        joinedload(CreditCard.brand)
    ).all()

    results = []
    for card, morning_limit, evening_limit, status in query_result:
        data = {
            "id": card.id,
            "name": card.name,
            "credit_card_limit": str(card.credit_card_limit) if card.credit_card_limit is not None else None,
            "bank_name": card.account.bank.name if card.account and card.account.bank else "",
            "status": status if status else 'Aktif',
            "card_number": card.credit_card_no, # Maskeleme frontend'de yapılacak
            "expiration_date": card.expiration_date.isoformat(), # Formatlama frontend'de yapılacak
            "current_morning_limit": str(morning_limit) if morning_limit is not None else None,
            "current_evening_limit": str(evening_limit) if evening_limit is not None else None,
        }
        results.append(data)
    return results

def get_daily_limits_for_month(year: int, month: int):
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    limits = DailyCreditCardLimit.query.options(
        joinedload(DailyCreditCardLimit.credit_card).joinedload(CreditCard.account).joinedload(Account.bank)
    ).filter(
        DailyCreditCardLimit.entry_date.between(start_date, end_date)
    ).order_by(DailyCreditCardLimit.entry_date).all()
    
    result_data = []
    for limit in limits:
        if limit.credit_card and limit.credit_card.account and limit.credit_card.account.bank:
            limit_dict = {
                'id': limit.id,
                'credit_card_id': limit.credit_card_id,
                'entry_date': limit.entry_date.isoformat(),
                'morning_limit': str(limit.morning_limit) if limit.morning_limit is not None else None,
                'evening_limit': str(limit.evening_limit) if limit.evening_limit is not None else None,
                'bank_name': limit.credit_card.account.bank.name,
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

                fill_value = card.credit_card_limit
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

# ## EKSİK FONKSİYONLAR EKLENDİ ##

def create_new_credit_card(data: dict):
    """Yeni bir kredi kartı oluşturur."""
    required_keys = ['name', 'account_id', 'card_brand_id', 'credit_card_limit', 'cash_advance_limit', 'statement_day', 'due_day', 'expiration_date', 'credit_card_no', 'cvc']
    if not all(key in data for key in required_keys):
        raise ValueError(f"Eksik alanlar. Gerekli alanlar: {', '.join(required_keys)}")
    
    if not Account.query.get(data.get('account_id')):
        raise ValueError("Bağlanmak istenen ana hesap bulunamadı.")
    if not CardBrand.query.get(data.get('card_brand_id')):
        raise ValueError("Geçersiz kart markası.")
    
    # Not: Burada credit_card_no ve cvc için şifreleme adımı yapılmalıdır.
    new_card = CreditCard(
        name=data['name'],
        account_id=data['account_id'],
        card_brand_id=data['card_brand_id'],
        credit_card_limit=_to_decimal(data['credit_card_limit']),
        cash_advance_limit=_to_decimal(data['cash_advance_limit']),
        statement_day=data['statement_day'],
        due_day=data['due_day'],
        expiration_date=datetime.strptime(data['expiration_date'], '%Y-%m-%d').date(),
        credit_card_no=data['credit_card_no'],
        cvc=data['cvc']
    )
    db.session.add(new_card)
    db.session.commit()
    
    # Yanıtı manuel olarak oluştur
    response_data = {
        "id": new_card.id,
        "name": new_card.name
    }
    return response_data

def get_all_card_brands():
    """Tüm kart markalarını (Visa, Mastercard vb.) listeler."""
    brands = CardBrand.query.all()
    return card_brands_schema.dump(brands)

def create_new_card_brand(data: dict):
    """Yeni bir kart markası oluşturur."""
    name = data.get('name')
    if not name:
        raise ValueError("'name' alanı zorunludur.")

    existing_brand = CardBrand.query.filter(func.lower(CardBrand.name) == func.lower(name)).first()
    if existing_brand:
        raise ValueError(f"'{name}' adında bir kart markası zaten mevcut.")

    new_brand = CardBrand(name=name)
    db.session.add(new_brand)
    db.session.commit()

    return card_brand_schema.dump(new_brand)
