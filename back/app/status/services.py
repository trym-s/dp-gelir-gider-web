# app/status/services.py

from datetime import date, datetime
from app import db
from app.models import StatusHistory, Account, KmhLimit, CreditCard
from .schemas import status_history_schema, status_histories_schema

SUBJECT_MODEL_MAP = {
    'account': Account,
    'kmh_limit': KmhLimit,
    'credit_card': CreditCard
}

def get_status_history_for_subject(subject_type: str, subject_id: int):
    # ... (Bu fonksiyon doğru, değişiklik yok) ...
    if subject_type not in SUBJECT_MODEL_MAP:
        raise ValueError("Geçersiz varlık tipi.")
    history = StatusHistory.query.filter_by(
        subject_type=subject_type,
        subject_id=subject_id
    ).order_by(StatusHistory.start_date.desc()).all()
    return status_histories_schema.dump(history)

def save_new_status(data: dict):
    """
    Herhangi bir varlık için yeni bir durum kaydı oluşturur.
    """
    subject_type = data.get('subject_type')
    
    # ## DEĞİŞİKLİK: Frontend'den 'account_id' gibi eski anahtarlar gelirse diye kontrol ekliyoruz. ##
    # Bu, kodu daha sağlam hale getirir.
    subject_id = data.get('subject_id') or data.get('account_id') or data.get('kmh_limit_id') or data.get('credit_card_id')

    if not subject_id:
        raise ValueError("Kaydın ID'si ('subject_id') belirtilmemiş.")

    model_class = SUBJECT_MODEL_MAP.get(subject_type)
    if not model_class:
        raise ValueError(f"'{subject_type}' geçersiz bir varlık tipidir.")

    subject_instance = db.session.get(model_class, subject_id)
    if not subject_instance:
        raise ValueError(f"ID'si {subject_id} olan bir '{subject_type}' kaydı bulunamadı.")
    
    # Gelen veriden yeni bir StatusHistory nesnesi oluşturmak için şemayı kullan
    # Not: 'subject_id' anahtarını payload'a ekleyerek şemanın doğrulamasından geçmesini sağlıyoruz.
    payload_for_schema = data.copy()
    payload_for_schema['subject_id'] = subject_id

    new_status = status_history_schema.load(payload_for_schema)
    
    db.session.add(new_status)
    db.session.commit()
    
    return status_history_schema.dump(new_status)
