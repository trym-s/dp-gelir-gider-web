# app/accounts/services.py

from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import func, exc
from sqlalchemy.orm import joinedload
from app import db
from app.models import Bank, Account, DailyBalance, StatusHistory
from typing import Union

# --- Yardımcı Fonksiyonlar ---
def _parse_date_string(date_str: str) -> date:
    """YYYY-MM-DD formatındaki string'i date objesine çevirir."""
    return datetime.strptime(date_str, '%Y-%m-%d').date()

def _to_decimal(value) -> Union[Decimal, None]:
    """Gelen değeri Decimal'a çevirir, None veya boş string'i None yapar."""
    if value is None or value == '':
        return None
    return Decimal(str(value))

# --- Servis Fonksiyonları ---

def get_all_accounts_with_details(date_str: str = None):
    target_date = _parse_date_string(date_str) if date_str else date.today()

    latest_status_subquery = db.session.query(
        StatusHistory.subject_id,
        StatusHistory.status,
        func.row_number().over(
            partition_by=StatusHistory.subject_id,
            order_by=StatusHistory.start_date.desc()
        ).label('rn')
    ).filter(
        StatusHistory.subject_type == 'account',
        StatusHistory.start_date <= target_date
    ).subquery()

    latest_balance_subquery = db.session.query(
        DailyBalance.account_id,
        DailyBalance.entry_date,
        DailyBalance.morning_balance, # <-- EKLENDİ
        DailyBalance.evening_balance,
        func.row_number().over(
            partition_by=DailyBalance.account_id,
            order_by=DailyBalance.entry_date.desc()
        ).label('rn')
    ).subquery()

    query_result = db.session.query(
        Account,
        latest_status_subquery.c.status,
        latest_balance_subquery.c.entry_date,
        latest_balance_subquery.c.morning_balance, # <-- EKLENDİ
        latest_balance_subquery.c.evening_balance
    ).outerjoin(
        latest_status_subquery,
        (Account.id == latest_status_subquery.c.subject_id) & (latest_status_subquery.c.rn == 1)
    ).outerjoin(
        latest_balance_subquery,
        (Account.id == latest_balance_subquery.c.account_id) & (latest_balance_subquery.c.rn == 1)
    ).options(
        db.joinedload(Account.bank)
    ).all()

    results = []
    for account, status, last_date, last_morning, last_evening in query_result:
        bank_name = account.bank.name if account.bank else "Banka Tanımsız"
        account_dict = {
            "id": account.id, "name": account.name, "bank_id": account.bank_id,
            "iban_number": account.iban_number, "bank_name": bank_name,
            "status": status if status else 'Aktif',
            "last_entry_date": last_date.isoformat() if last_date else None,
            "last_morning_balance": str(last_morning) if last_morning is not None else None, # <-- EKLENDİ
            "last_evening_balance": str(last_evening) if last_evening is not None else None
        }
        results.append(account_dict)
    return results

def get_daily_balances_for_month(year: int, month: int):
    """Belirtilen ay ve yıla ait tüm günlük bakiyeleri, o günkü durumlarıyla birlikte getirir."""
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)

    status_subquery = db.session.query(
        StatusHistory.status
    ).filter(
        StatusHistory.subject_id == DailyBalance.account_id,
        StatusHistory.subject_type == 'account',
        StatusHistory.start_date <= DailyBalance.entry_date
    ).order_by(
        StatusHistory.start_date.desc()
    ).limit(1).scalar_subquery().label('daily_status')

    balances_with_status = db.session.query(
        DailyBalance,
        status_subquery
    ).options(
        db.joinedload(DailyBalance.account).joinedload(Account.bank)
    ).filter(
        DailyBalance.entry_date.between(start_date, end_date)
    ).all()
    
    result_data = []
    for balance_obj, daily_status in balances_with_status:
        # ## KESİN ÇÖZÜM: 'if' bloğu içindeki tüm işlemlerin
        # sadece bu blokta kalması sağlanarak hata giderildi.
        if balance_obj.account and balance_obj.account.bank:
            balance_dict = {
                'id': balance_obj.id,
                'account_id': balance_obj.account_id,
                'entry_date': balance_obj.entry_date.isoformat(),
                'morning_balance': str(balance_obj.morning_balance) if balance_obj.morning_balance is not None else None,
                'evening_balance': str(balance_obj.evening_balance) if balance_obj.evening_balance is not None else None,
                'bank_name': balance_obj.account.bank.name,
                'account_name': balance_obj.account.name,
                'status': daily_status if daily_status else 'Aktif'
            }
            result_data.append(balance_dict)
        else:
            # Bu log, veritabanınızdaki olası "yetim" verileri tespit etmenize yardımcı olur.
            print(f"Uyarı: ID'si {balance_obj.id} olan bakiye kaydının ilişkili hesabı/bankası yok. Atlanıyor.")

    return result_data


def save_daily_entries(entries_data: list):
    if not entries_data:
        return {"message": "Kaydedilecek veri bulunamadı."}
    try:
        # Gelen veriyi hesap bazında grupla ve her hesabı ayrı işle
        entries_by_account_key = {}
        for entry in entries_data:
            key = (entry['banka'], entry['hesap'])
            if key not in entries_by_account_key: entries_by_account_key[key] = []
            entries_by_account_key[key].append(entry)

        for (bank_name, account_name), entries in entries_by_account_key.items():
            account = Account.query.join(Bank).filter(Bank.name == bank_name, Account.name == account_name).first()
            if not account: continue

            # O hesaba ait gelen tüm girişleri tarihe göre sırala
            sorted_entries = sorted(entries, key=lambda x: _parse_date_string(x['tarih']))
            
            for entry_data in sorted_entries:
                submission_date = _parse_date_string(entry_data['tarih'])
                
                # 1. Adım: Gönderilen tarihten önceki en son kaydı bul
                last_record = DailyBalance.query.filter(
                    DailyBalance.account_id == account.id,
                    DailyBalance.entry_date < submission_date
                ).order_by(DailyBalance.entry_date.desc()).first()

                # 2. Adım: Boşluk doldurma için kullanılacak değeri belirle
                fill_value = None
                if last_record:
                    # Eğer son kaydın akşamı boşsa, sabahını kullan
                    fill_value = last_record.evening_balance if last_record.evening_balance is not None else last_record.morning_balance
                    
                    # Senaryo 1: 21.07'nin akşamını doldur
                    if last_record.evening_balance is None and fill_value is not None:
                        last_record.evening_balance = fill_value
                        db.session.add(last_record)

                # 3. Adım: Boşlukları doldur (Gap Filling)
                if last_record and fill_value is not None:
                    gap_date = last_record.entry_date + timedelta(days=1)
                    while gap_date < submission_date:
                        existing_gap = DailyBalance.query.filter_by(account_id=account.id, entry_date=gap_date).first()
                        if not existing_gap:
                            db.session.add(DailyBalance(
                                account_id=account.id, entry_date=gap_date,
                                morning_balance=fill_value,
                                evening_balance=fill_value
                            ))
                        gap_date += timedelta(days=1)
                
                # 4. Adım: Gelen asıl kaydı işle
                sabah_input = _to_decimal(entry_data.get('sabah'))
                aksam_input = _to_decimal(entry_data.get('aksam'))

                existing_entry = DailyBalance.query.filter_by(account_id=account.id, entry_date=submission_date).first()

                if existing_entry:
                    # Var olan kaydı güncelle
                    if sabah_input is not None:
                        existing_entry.morning_balance = sabah_input
                    if aksam_input is not None:
                        existing_entry.evening_balance = aksam_input
                    # Eğer sadece sabah girildiyse, akşamı null yap (güncellenmemeli)
                    elif sabah_input is not None and aksam_input is None:
                         existing_entry.evening_balance = None
                else:
                    # Yeni kayıt oluştur
                    final_sabah = sabah_input
                    if final_sabah is None:
                        final_sabah = fill_value # Sabah girilmediyse, bir önceki günden al

                    db.session.add(DailyBalance(
                        account_id=account.id,
                        entry_date=submission_date,
                        morning_balance=final_sabah,
                        evening_balance=aksam_input # Akşam girilmediyse None (NULL) kalır
                    ))
        
        db.session.commit()
        return {"message": "Günlük girişler başarıyla kaydedildi."}
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Girişleri kaydederken beklenmedik bir hata oluştu: {e}")


def create_new_account(data: dict):
    """Yeni bir vadesiz hesap oluşturur."""
    if not data.get('name') or not data.get('bank_id'):
        raise ValueError("'name' and 'bank_id' alanları zorunludur.")

    bank = Bank.query.get(data.get('bank_id'))
    if not bank:
        raise ValueError("Belirtilen banka bulunamadı.")
    
    existing = Account.query.filter_by(name=data['name'], bank_id=data['bank_id']).first()
    if existing:
        raise ValueError("Bu bankada aynı isimde bir hesap zaten mevcut.")

    new_account = Account(
        name=data['name'],
        bank_id=data['bank_id'],
        iban_number=data.get('iban_number')
    )
    db.session.add(new_account)
    db.session.commit()
    
    response_data = {
        'id': new_account.id,
        'name': new_account.name,
        'bank_id': new_account.bank_id,
        'iban_number': new_account.iban_number,
        'bank_name': new_account.bank.name,
        'created_at': new_account.created_at.isoformat()
    }
    return response_data