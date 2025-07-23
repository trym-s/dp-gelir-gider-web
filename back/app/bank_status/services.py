# back/app/bank_status/services.py

from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func 
from datetime import datetime # _parse_date_string için datetime modülü
from typing import Union # <-- YENİ EKLENDİ: Python 3.9 için Union tipi

# Ana uygulama ve modelleri import et
from app import db 
from app.models import Bank, Account, DailyBalance 
from .schemas import account_schema, accounts_schema, daily_balance_schema, daily_balances_schema 

# --- Yardımcı Fonksiyonlar ---
def _parse_date_string(date_str: str) -> date:
    """YYYY-MM-DD formatındaki string'i datetime.date objesine çevirir."""
    # DÜZELTME BURADA: '%d.%m.%Y' yerine '%Y-%m-%d' kullanıldı
    return datetime.strptime(date_str, '%Y-%m-%d').date()

# Tip ipucu Decimal | None yerine Union[Decimal, None] olarak değiştirildi
def _to_decimal(value) -> Union[Decimal, None]: # <-- DÜZELTME BURADA
    """Gelen değeri Decimal'a çevirir, None veya boş string'i None yapar."""
    if value is None or value == '':
        return None
    return Decimal(str(value))

# --- Servis Fonksiyonları ---

def get_all_accounts():
    """
    Sistemdeki tüm hesapları (banka bilgileriyle birlikte) getirir.
    Frontend'deki açılır menüler ve banka kartları için kullanılabilir.
    """
    accounts = Account.query.options(db.joinedload(Account.bank)).all()
    return accounts_schema.dump(accounts)

def get_daily_balances_for_month(year: int, month: int):
    """
    Belirtilen ay ve yıla ait tüm günlük bakiyeleri getirir.
    Pivot tablo verisi için banka ve hesap adlarını da JOIN ederek çeker.
    """
    start_date = date(year, month, 1)
    
    # Ayın son gününü doğru hesaplama (dayjs backend'de olmadığı için datetime kullanılır)
    # Python'da ayın son gününü bulmanın en güvenli yolu:
    # Sonraki ayın ilk gününden 1 gün çıkar.
    if month == 12:
        end_date = date(year, month, 31)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    balances = DailyBalance.query.options(
        db.joinedload(DailyBalance.account).joinedload(Account.bank)
    ).filter(
        DailyBalance.entry_date >= start_date,
        DailyBalance.entry_date <= end_date
    ).order_by(
        DailyBalance.entry_date,
        DailyBalance.bank_id, 
        DailyBalance.account_id
    ).all()
    
    return daily_balances_schema.dump(balances)


def save_daily_entries(entries_data: list):
    """
    Frontend'den gelen günlük bakiye girişlerini kaydeder.
    Girilmeyen günler için otomatik gap kapatma mantığını uygular.
    Her bir entry_data dictionary'si: {'banka': 'AKBANK', 'hesap': 'Ana Hesap', 'tarih': 'DD.MM.YYYY', 'sabah': 123.45, 'aksam': 678.90}
    """
    
    try:
        unique_account_tuples = set()
        for entry_dict in entries_data:
            unique_account_tuples.add((entry_dict['banka'], entry_dict['hesap']))
        
        submission_date_str = entries_data[0]['tarih'] if entries_data else None
        submission_date = _parse_date_string(submission_date_str) if submission_date_str else None

        if not submission_date:
            raise ValueError("Submission date missing from entries.")

        records_to_add_or_update = []

        for bank_name, account_name in unique_account_tuples:
            bank = Bank.query.filter_by(name=bank_name).first()
            account = Account.query.filter_by(name=account_name, bank_id=bank.id if bank else None).first()

            if not bank or not account:
                print(f"Uyarı: Banka '{bank_name}' veya Hesap '{account_name}' bulunamadı. Kayıt atlanıyor.")
                continue

            last_existing_balance = DailyBalance.query.filter_by(
                bank_id=bank.id,
                account_id=account.id
            ).filter(
                DailyBalance.entry_date < submission_date
            ).order_by(
                DailyBalance.entry_date.desc()
            ).first()

            if last_existing_balance:
                current_gap_date = last_existing_balance.entry_date + timedelta(days=1)
                
                while current_gap_date < submission_date:
                    existing_gap_entry = DailyBalance.query.filter_by(
                        bank_id=bank.id,
                        account_id=account.id,
                        entry_date=current_gap_date
                    ).first()

                    if not existing_gap_entry:
                        gap_balance = DailyBalance(
                            bank_id=bank.id,
                            account_id=account.id,
                            entry_date=current_gap_date,
                            morning_balance=last_existing_balance.morning_balance,
                            evening_balance=last_existing_balance.evening_balance
                        )
                        records_to_add_or_update.append(gap_balance)
                    
                    current_gap_date += timedelta(days=1)
            
            incoming_entry_for_this_account = next(
                (e for e in entries_data if e['banka'] == bank_name and e['hesap'] == account_name),
                None
            )
            
            if incoming_entry_for_this_account:
                existing_main_entry = DailyBalance.query.filter_by(
                    bank_id=bank.id,
                    account_id=account.id,
                    entry_date=submission_date
                ).first()

                sabah_balance_dec = _to_decimal(incoming_entry_for_this_account.get('sabah'))
                aksam_balance_dec = _to_decimal(incoming_entry_for_this_account.get('aksam'))

                if existing_main_entry:
                    existing_main_entry.morning_balance = sabah_balance_dec
                    existing_main_entry.evening_balance = aksam_balance_dec
                    db.session.add(existing_main_entry)
                else:
                    new_main_entry = DailyBalance(
                        bank_id=bank.id,
                        account_id=account.id,
                        entry_date=submission_date,
                        morning_balance=sabah_balance_dec,
                        evening_balance=aksam_balance_dec
                    )
                    records_to_add_or_update.append(new_main_entry)
            else:
                print(f"Uyarı: {bank_name}-{account_name} için {submission_date} tarihinde giriş verisi bulunamadı.")


        if records_to_add_or_update:
            db.session.bulk_save_objects(records_to_add_or_update)
        
        db.session.commit()

        return {"message": "Günlük girişler ve boşluklar başarıyla kaydedildi/güncellendi."}

    except IntegrityError as e:
        db.session.rollback()
        print(f"Veritabanı bütünlük hatası: {e}")
        raise ValueError("Bu tarih için bazı hesaplarda zaten giriş bulunuyor veya veri bütünlüğü ihlali oluştu.")
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"SQLAlchemy hatası: {e}")
        raise ValueError("Veritabanı işlemi sırasında bir hata oluştu.")
    except Exception as e:
        db.session.rollback()
        print(f"Beklenmedik hata: {e}")
        raise ValueError(f"Girişleri kaydederken beklenmedik bir hata oluştu: {str(e)}")

def create_account(account_data: dict):
    """Yeni bir hesap oluşturur."""
    try:
        account = account_schema.load(account_data)
        db.session.add(account)
        db.session.commit()
        return account_schema.dump(account)
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Hesap oluşturulurken hata: {str(e)}")

def get_all_banks():
    """Tüm bankaları getirir."""
    banks = Bank.query.all()
    return [{'id': bank.id, 'name': bank.name} for bank in banks]