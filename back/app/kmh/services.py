# app/kmh/services.py

from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app import db
from app.models import Account, KmhLimit, DailyRisk, StatusHistory, Bank
from .schemas import kmh_limit_schema, kmh_limits_schema, daily_risks_schema
from typing import Union

# --- Yardımcı Fonksiyonlar (Diğer modülle aynı) ---
def _parse_date_string(date_str: str) -> date:
    """YYYY-MM-DD formatındaki string'i date objesine çevirir."""
    return datetime.strptime(date_str, '%Y-%m-%d').date()


def _to_decimal(value) -> Union[Decimal, None]:
    if value is None or value == '': return None
    return Decimal(str(value))

# --- Servis Fonksiyonları ---

def get_all_kmh_limits():
    """Tüm KMH limitlerini, en son sabah/akşam riskleriyle birlikte getirir."""
    today = date.today()

    latest_risk_subquery = db.session.query(
        DailyRisk.kmh_limit_id,
        DailyRisk.morning_risk, # <-- EKLENDİ
        DailyRisk.evening_risk,
        func.row_number().over(
            partition_by=DailyRisk.kmh_limit_id,
            order_by=DailyRisk.entry_date.desc()
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
        StatusHistory.subject_type == 'kmh_limit',
        StatusHistory.start_date <= today
    ).subquery()

    query_result = db.session.query(
        KmhLimit,
        latest_risk_subquery.c.morning_risk, # <-- EKLENDİ
        latest_risk_subquery.c.evening_risk,
        latest_status_subquery.c.status
    ).outerjoin(
        latest_risk_subquery,
        (KmhLimit.id == latest_risk_subquery.c.kmh_limit_id) & (latest_risk_subquery.c.rn == 1)
    ).outerjoin(
        latest_status_subquery,
        (KmhLimit.id == latest_status_subquery.c.subject_id) & (latest_status_subquery.c.rn == 1)
    ).options(
        joinedload(KmhLimit.account).joinedload(Account.bank)
    ).all()

    results = []
    for kmh_limit, morning_risk, evening_risk, status in query_result:
        day = kmh_limit.statement_day
        statement_date_str = f"{day:02d}.{today.month:02d}.{today.year}"
        
        data = {
            "id": kmh_limit.id,
            "name": kmh_limit.name,
            "kmh_limit": str(kmh_limit.kmh_limit) if kmh_limit.kmh_limit is not None else None,
            "bank_name": kmh_limit.account.bank.name if kmh_limit.account and kmh_limit.account.bank else "",
            "status": status if status else 'Aktif',
            "current_morning_risk": str(morning_risk) if morning_risk is not None else None, # <-- EKLENDİ
            "current_evening_risk": str(evening_risk) if evening_risk is not None else None, # <-- Adı daha anlaşılır hale getirildi
            "statement_date_str": statement_date_str
        }
        results.append(data)
        
    return results

def get_daily_risks_for_month(year: int, month: int):
    """Belirtilen ay ve yıla ait tüm günlük riskleri getirir (Pivot tablo için)."""
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)

    risks = DailyRisk.query.options(
        joinedload(DailyRisk.kmh_limit).joinedload(KmhLimit.account).joinedload(Account.bank)
    ).filter(
        DailyRisk.entry_date.between(start_date, end_date)
    ).order_by(DailyRisk.entry_date).all()
    
    return daily_risks_schema.dump(risks)

def save_daily_risks(entries_data: list):
    if not entries_data:
        raise ValueError("Giriş verisi boş olamaz.")
    try:
        entries_by_account_key = {}
        for entry in entries_data:
            key = (entry['banka'], entry['hesap'])
            if key not in entries_by_account_key: entries_by_account_key[key] = []
            entries_by_account_key[key].append(entry)

        for (bank_name, account_name), entries in entries_by_account_key.items():
            kmh_limit = KmhLimit.query.join(Account).join(Bank).filter(
                Bank.name == bank_name, KmhLimit.name == account_name
            ).first()
            if not kmh_limit: continue

            sorted_entries = sorted(entries, key=lambda x: _parse_date_string(x['tarih']))
            
            for entry_data in sorted_entries:
                submission_date = _parse_date_string(entry_data['tarih'])
                
                # 1. Adım: Gönderilen tarihten önceki en son kaydı bul
                last_record = DailyRisk.query.filter(
                    DailyRisk.kmh_limit_id == kmh_limit.id,
                    DailyRisk.entry_date < submission_date
                ).order_by(DailyRisk.entry_date.desc()).first()

                # 2. Adım: Boşluk doldurma için kullanılacak değeri belirle
                fill_value = None
                if last_record:
                    # Önce akşam riskini kullan, eğer boşsa sabah riskini al
                    fill_value = last_record.evening_risk if last_record.evening_risk is not None else last_record.morning_risk
                    
                    # Senaryo 1: Önceki günün akşamı boşsa, onu sabah değeriyle doldur
                    if last_record.evening_risk is None and fill_value is not None:
                        last_record.evening_risk = fill_value
                        db.session.add(last_record)

                # 3. Adım: Boşlukları doldur (Gap Filling)
                if last_record and fill_value is not None:
                    gap_date = last_record.entry_date + timedelta(days=1)
                    while gap_date < submission_date:
                        existing_gap = DailyRisk.query.filter_by(kmh_limit_id=kmh_limit.id, entry_date=gap_date).first()
                        if not existing_gap:
                            db.session.add(DailyRisk(
                                kmh_limit_id=kmh_limit.id, entry_date=gap_date,
                                morning_risk=fill_value,
                                evening_risk=fill_value
                            ))
                        gap_date += timedelta(days=1)
                
                # 4. Adım: Gelen asıl kaydı işle
                sabah_input = _to_decimal(entry_data.get('sabah'))
                aksam_input = _to_decimal(entry_data.get('aksam'))

                existing_entry = DailyRisk.query.filter_by(kmh_limit_id=kmh_limit.id, entry_date=submission_date).first()

                if existing_entry:
                    # Var olan kaydı güncelle
                    if sabah_input is not None:
                        existing_entry.morning_risk = sabah_input
                    # Akşam değeri özellikle gönderildiyse güncelle (boş string bile olsa)
                    if 'aksam' in entry_data:
                        existing_entry.evening_risk = aksam_input
                else:
                    # Yeni kayıt oluştur
                    final_sabah = sabah_input
                    if final_sabah is None:
                        final_sabah = fill_value # Sabah girilmediyse, bir önceki günden al

                    db.session.add(DailyRisk(
                        kmh_limit_id=kmh_limit.id,
                        entry_date=submission_date,
                        morning_risk=final_sabah,
                        evening_risk=aksam_input # Akşam girilmediyse None (NULL) kalır
                    ))
        
        db.session.commit()
        return {"message": "Günlük risk girişleri başarıyla kaydedildi."}
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Riskler kaydedilirken bir hata oluştu: {e}")
    
def create_new_kmh_limit(data: dict):
    """Yeni bir KMH Limiti oluşturur."""
    # Gerekli alanların kontrolü
    required_keys = ['name', 'account_id', 'kmh_limit', 'statement_day']
    if not all(key in data for key in required_keys):
        raise ValueError(f"Eksik alanlar. Gerekli alanlar: {', '.join(required_keys)}")

    # Ana hesabın varlığını kontrol et
    account = Account.query.get(data.get('account_id'))
    if not account:
        raise ValueError(f"ID'si {data.get('account_id')} olan bir ana hesap bulunamadı.")

    # Yeni KmhLimit nesnesini oluştur
    new_kmh_limit = KmhLimit(
        name=data['name'],
        account_id=data['account_id'],
        kmh_limit=Decimal(str(data['kmh_limit'])),
        statement_day=data['statement_day']
    )
    
    db.session.add(new_kmh_limit)
    db.session.commit()

    # Yanıtı manuel olarak oluştur (schema.dump() hatalarını önlemek için)
    response_data = {
        'id': new_kmh_limit.id,
        'name': new_kmh_limit.name,
        'account_id': new_kmh_limit.account_id,
        'kmh_limit': str(new_kmh_limit.kmh_limit),
        'statement_day': new_kmh_limit.statement_day,
        'created_at': new_kmh_limit.created_at.isoformat()
    }
    return response_data