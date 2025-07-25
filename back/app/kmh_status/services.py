# app/kmh_status/services.py
from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from typing import Union # <-- YENİ İMPORT
from app import db
from app.models import Bank, Account, AccountType, DailyRisk, AccountStatusHistory
# --- DÜZELTME: Tekil şemayı da import ediyoruz ---
from .schemas import kmh_account_schema, daily_risks_schema

# --- Yardımcı Fonksiyonlar (Aynı kalıyor) ---
def _parse_date_string_dmy(date_str: str) -> date:
    """DD.MM.YYYY formatındaki string'i datetime.date objesine çevirir."""
    return datetime.strptime(date_str, '%d.%m.%Y').date()

def _to_decimal(value) -> Union[Decimal, None]: # <-- DÜZELTME BURADA
    """Gelen değeri Decimal'a çevirir, None veya boş string'i None yapar."""
    if value is None or value == '':
        return None
    return Decimal(str(value))

# --- Servis Fonksiyonları ---

def get_all_kmh_accounts():
    """
    Tüm KMH hesaplarını, tanımlarını, güncel durumlarını ve güncel risklerini getirir.
    """
    today = date.today()

    latest_risk_subquery = db.session.query(
        DailyRisk.account_id,
        DailyRisk.evening_risk,
        func.row_number().over(
            partition_by=DailyRisk.account_id,
            order_by=DailyRisk.entry_date.desc()
        ).label('rn')
    ).subquery()

    latest_status_subquery = db.session.query(
        AccountStatusHistory.account_id,
        AccountStatusHistory.status,
        func.row_number().over(
            partition_by=AccountStatusHistory.account_id,
            order_by=AccountStatusHistory.start_date.desc()
        ).label('rn')
    ).filter(AccountStatusHistory.start_date <= today).subquery()

    query_result = db.session.query(
        Account,
        latest_risk_subquery.c.evening_risk,
        latest_status_subquery.c.status
    ).join(
        Account.kmh_definition
    ).outerjoin(
        latest_risk_subquery,
        (Account.id == latest_risk_subquery.c.account_id) & (latest_risk_subquery.c.rn == 1)
    ).outerjoin(
        latest_status_subquery,
        (Account.id == latest_status_subquery.c.account_id) & (latest_status_subquery.c.rn == 1)
    ).options(
        joinedload(Account.bank),
        joinedload(Account.kmh_definition)
    ).filter(
        Account.account_type == AccountType.KMH
    ).all()

    results = []
    for account, current_risk, status in query_result:
        # --- ÖNEMLİ DÜZELTME: Doğru (tekil) şemayı kullanıyoruz ---
        data = kmh_account_schema.dump(account)
        
        # Frontend'in beklediği alan adlarını kullanalım
        data['risk'] = current_risk
        data['kmhLimiti'] = data.pop('kmh_limit', None)
        data['status'] = status if status else 'Aktif'
        day = data.pop('statement_day', 1)
        data['hesapKesimTarihi'] = f"{day}.{today.month}.{today.year}"
        results.append(data)

    return results


def get_daily_risks_for_month(year: int, month: int):
    """Belirtilen ay ve yıla ait tüm günlük riskleri getirir (Pivot tablo için)."""
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year, month, 31)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)

    risks = DailyRisk.query.filter(
        DailyRisk.entry_date.between(start_date, end_date)
    ).order_by(DailyRisk.entry_date).all()
    
    return daily_risks_schema.dump(risks)


def save_daily_risks(entries_data: list):
    """Frontend'den gelen günlük risk girişlerini kaydeder ve gap filling uygular."""
    if not entries_data:
        raise ValueError("Giriş verisi boş olamaz.")

    try:
        entries_by_account = {}
        for entry in entries_data:
            key = (entry['banka'], entry['hesap'])
            if key not in entries_by_account:
                entries_by_account[key] = []
            entries_by_account[key].append(entry)

        for (bank_name, account_name), entries in entries_by_account.items():
            bank = Bank.query.filter_by(name=bank_name).first()
            account = Account.query.filter_by(name=account_name, bank_id=bank.id if bank else None).first()

            if not account:
                print(f"Uyarı: {bank_name} - {account_name} bulunamadı, atlanıyor.")
                continue

            for entry_data in entries:
                submission_date = _parse_date_string_dmy(entry_data['tarih'])
                
                last_risk = DailyRisk.query.filter(
                    DailyRisk.account_id == account.id,
                    DailyRisk.entry_date < submission_date
                ).order_by(DailyRisk.entry_date.desc()).first()

                if last_risk:
                    gap_date = last_risk.entry_date + timedelta(days=1)
                    while gap_date < submission_date:
                        existing_gap_entry = DailyRisk.query.filter_by(account_id=account.id, entry_date=gap_date).first()
                        if not existing_gap_entry:
                            gap_risk = DailyRisk(
                                account_id=account.id,
                                entry_date=gap_date,
                                morning_risk=last_risk.evening_risk,
                                evening_risk=last_risk.evening_risk
                            )
                            db.session.add(gap_risk)
                        gap_date += timedelta(days=1)

                main_entry = DailyRisk.query.filter_by(account_id=account.id, entry_date=submission_date).first()
                if main_entry:
                    main_entry.morning_risk = _to_decimal(entry_data.get('sabah'))
                    main_entry.evening_risk = _to_decimal(entry_data.get('aksam'))
                else:
                    main_entry = DailyRisk(
                        account_id=account.id,
                        entry_date=submission_date,
                        morning_risk=_to_decimal(entry_data.get('sabah')),
                        evening_risk=_to_decimal(entry_data.get('aksam'))
                    )
                    db.session.add(main_entry)
        
        db.session.commit()
        return {"message": "Günlük risk girişleri başarıyla kaydedildi."}

    except Exception as e:
        db.session.rollback()
        raise e
