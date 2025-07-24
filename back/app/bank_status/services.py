# back/app/bank_status/services.py

from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func 
from datetime import datetime # _parse_date_string için datetime modülü
from typing import Union # <-- YENİ EKLENDİ: Python 3.9 için Union tipi

# Ana uygulama ve modelleri import et
from app import db 
from app.models import Bank, Account, DailyBalance, AccountStatusHistory 
from .schemas import ( # schemaları daha okunaklı import edelim
    account_schema, accounts_schema, 
    daily_balance_schema, daily_balances_schema,
    account_status_history_schema, account_status_histories_schema
)

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

# --- GÜNCELLENEN Servis Fonksiyonu ---
def get_all_accounts(date_str: str = None):
    """
    Sistemdeki tüm hesapları getirir.
    Eğer date_str belirtilmişse, o tarihteki durumlarını getirir.
    Belirtilmemişse, en güncel durumlarını getirir.
    """
    # --- DEBUG İÇİN KONTROL NOKTASI 1 ---
    print(f"\n--- get_all_accounts servisi çalıştı ---")
    if date_str:
        print(f"DEBUG: Tarih filtresi isteniyor. Gelen tarih: {date_str}")
    else:
        print("DEBUG: Tarih filtresi yok, güncel durumlar getirilecek.")
    # ------------------------------------

    target_date = _parse_date_string(date_str) if date_str else date.today()

    latest_status_subquery = db.session.query(
        AccountStatusHistory.account_id,
        AccountStatusHistory.status,
        func.row_number().over(
            partition_by=AccountStatusHistory.account_id,
            order_by=AccountStatusHistory.start_date.desc()
        ).label('rn')
    ).filter(
        AccountStatusHistory.start_date <= target_date
    ).subquery()

    accounts_with_status = db.session.query(
        Account,
        latest_status_subquery.c.status
    ).outerjoin(
        latest_status_subquery,
        (Account.id == latest_status_subquery.c.account_id) & (latest_status_subquery.c.rn == 1)
    ).options(
        db.joinedload(Account.bank)
    ).all()

    serialized_accounts = []
    print("DEBUG: Filtreleme döngüsü başlıyor...")
    for account, status in accounts_with_status:
        account_dict = account_schema.dump(account)
        final_status = status if status else 'Aktif'
        
        # --- DEBUG İÇİN KONTROL NOKTASI 2 ---
        print(f"--> Hesap: {account.name} (ID: {account.id}), Veritabanından gelen durum: {status}, Nihai Durum: {final_status}")
        # ------------------------------------

        if date_str:
            if final_status == 'Aktif':
                # --- DEBUG İÇİN KONTROL NOKTASI 3 ---
                print(f"    + DURUM: Aktif. Listeye EKLENİYOR.")
                account_dict['status'] = final_status
                serialized_accounts.append(account_dict)
            else:
                # --- DEBUG İÇİN KONTROL NOKTASI 4 ---
                print(f"    - DURUM: {final_status}. Liste dışı BIRAKILIYOR.")
        else: 
            account_dict['status'] = final_status
            serialized_accounts.append(account_dict)
            
    print(f"--- get_all_accounts servisi bitti. Frontend'e {len(serialized_accounts)} adet hesap gönderilecek. ---\n")
    return serialized_accounts

# --- YENİ EKLENEN Servis Fonksiyonları ---

def get_status_history_for_account(account_id: int):
    """Belirli bir hesabın tüm durum geçmişini getirir."""
    # Hesabın varlığını kontrol et (opsiyonel ama iyi bir pratik)
    account = Account.query.get_or_404(account_id)
    # İlişki üzerinden sıralı geçmişi al
    history = account.status_history.all()
    return account_status_histories_schema.dump(history)

def save_new_account_status(data: dict):
    """Yeni bir hesap durumu kaydeder."""
    account_id = data.get('account_id')
    
    # Gerekli alanların kontrolü
    if not all([account_id, data.get('status'), data.get('start_date')]):
        raise ValueError("account_id, status, ve start_date alanları zorunludur.")

    # Hesabın varlığını kontrol et
    account = Account.query.get(account_id)
    if not account:
        raise ValueError(f"ID'si {account_id} olan bir hesap bulunamadı.")
    
    # Yeni durumu oluştur
    try:
        new_status = AccountStatusHistory(
            account_id=account_id,
            status=data['status'],
            start_date=_parse_date_string(data['start_date']),
            end_date=_parse_date_string(data['end_date']) if data.get('end_date') else None,
            reason=data.get('reason')
        )
        db.session.add(new_status)
        db.session.commit()
        return account_status_history_schema.dump(new_status)
    except Exception as e:
        db.session.rollback()
        print(f"Durum kaydederken hata: {e}")
        raise ValueError("Yeni durum kaydı oluşturulurken bir veritabanı hatası oluştu.")


def get_daily_balances_for_month(year: int, month: int):
    """
    Belirtilen ay ve yıla ait tüm günlük bakiyeleri getirir.
    YENİ: Her bir bakiye kaydı için, o gün geçerli olan hesap durumunu da getirir.
    """
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year, month, 31)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # Her bir bakiye satırı için, o tarihteki en güncel durumu bulan
    # ilişkili bir alt sorgu (correlated subquery). LATERAL JOIN'in SQLAlchemy karşılığı.
    status_subquery = db.session.query(
        AccountStatusHistory.status
    ).filter(
        AccountStatusHistory.account_id == DailyBalance.account_id,
        AccountStatusHistory.start_date <= DailyBalance.entry_date
    ).order_by(
        AccountStatusHistory.start_date.desc()
    ).limit(1).scalar_subquery()

    # Ana sorgu: Bakiye, hesap, banka ve yanal olarak durum bilgisini birleştir.
    balances_with_status = db.session.query(
        DailyBalance,
        status_subquery.label('daily_status') # Durum bilgisini etiketle
    ).options(
        db.joinedload(DailyBalance.account).joinedload(Account.bank)
    ).filter(
        DailyBalance.entry_date >= start_date,
        DailyBalance.entry_date <= end_date
    ).order_by(
        DailyBalance.entry_date,
        DailyBalance.bank_id, 
        DailyBalance.account_id
    ).all()
    
    # Sonuçları şema için hazırla.
    result_data = []
    for balance_obj, daily_status in balances_with_status:
        # Şema dump işleminden önce 'status' alanını balance objesine ekle
        balance_obj.status = daily_status if daily_status else 'Aktif'
        result_data.append(balance_obj)

    return daily_balances_schema.dump(result_data)


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