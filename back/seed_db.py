# back/seed_db.py

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app import create_app, db # create_app fonksiyonunu ve db objesini import edin
from app.models import Bank, Account, DailyBalance # Modellerinizi import edin
from datetime import date, timedelta
from decimal import Decimal
import sys

print("--- Veritabanına Örnek Veri Ekleniyor ---")

# Flask uygulamasını oluştur ve uygulama context'ini aktif et
app = create_app()
with app.app_context():
    try:
        # --- 1. Banka Kayıtları (Var Olanları Sorgula) ---
        # Banka ekleme kodunu kaldırdık, sadece mevcut bankaları sorguluyoruz
        all_banks = {b.name: b for b in Bank.query.all()}
        
        if not all_banks:
            print("Hata: Veritabanında hiç banka kaydı bulunamadı. Lütfen önce banka tablonuzu doldurun.")
            sys.exit(1) # Hata koduyla çıkış

        print(f"Mevcut bankalar yüklendi: {', '.join(all_banks.keys())}")


        # --- 2. Hesap Kayıtları (Accounts) ---
        account_data_to_add = [
            # Akbank
            {'bank_name': 'Akbank', 'name': 'Ana Hesap', 'iban': 'TR30000165451234567890123456'},
            {'bank_name': 'Akbank', 'name': 'Döviz Hesabı', 'iban': 'TR30000165459876543210987654'},
            # Yapı Kredi
            {'bank_name': 'Yapı Kredi', 'name': 'Ticari Hesap', 'iban': 'TR12000199991111222233334444'},
            # Türkiye İş Bankası
            {'bank_name': 'Türkiye İş Bankası', 'name': 'Yatırım Hesabı', 'iban': 'TR99000600005555666677778888'},
            {'bank_name': 'Türkiye İş Bankası', 'name': 'Euro Hesabı', 'iban': 'TR99000600009999888877776666'},
            # QNB
            {'bank_name': 'QNB', 'name': 'Vadesiz TL', 'iban': 'TR77000200001234567890123456'},
            # Ziraat Bankası
            {'bank_name': 'Ziraat Bankası', 'name': 'Maaş Hesabı', 'iban': 'TR01000100001111222233334444'},
            {'bank_name': 'Ziraat Bankası', 'name': 'Çiftçi Hesabı', 'iban': 'TR01000100005555666677778888'},
            # halkbank
            {'bank_name': 'halkbank', 'name': 'Ticari Kredi', 'iban': 'TR02000120001234567890123456'},
            # Türkiye Finans Bankası
            {'bank_name': 'Türkiye Finans Bankası', 'name': 'Bireysel Hesap', 'iban': 'TR88000620001234567890123456'},
            {'bank_name': 'Türkiye Finans Bankası', 'name': 'Kredi Kartı', 'iban': 'TR88000620009876543210987654'},
            # Vakıf Bank
            {'bank_name': 'Vakıf Bank', 'name': 'Tarım Hesabı', 'iban': 'TR39000680001234567890123456'},
            # TEB
            {'bank_name': 'TEB', 'name': 'Şirket Hesabı', 'iban': 'TR55000320001234567890123456'},
        ]

        all_accounts = {}
        for data in account_data_to_add:
            bank_obj = all_banks.get(data['bank_name'])
            if bank_obj:
                account = Account.query.filter_by(name=data['name'], bank_id=bank_obj.id).first()
                if not account:
                    try: # IBAN unique hatasını yakalamak için
                        account = Account(name=data['name'], bank_id=bank_obj.id, iban_number=data['iban'])
                        db.session.add(account)
                        db.session.flush() # ID'yi hemen almak için
                        print(f"Eklendi: Hesap '{data['name']}' ({data['bank_name']})")
                    except IntegrityError as e:
                        db.session.rollback() # Rollback yapmadan devam etmeyin
                        print(f"Uyarı: Hesap '{data['name']}' ({data['bank_name']}) zaten var veya IBAN tekrarı: {e.orig}", file=sys.stderr)
                        account = Account.query.filter_by(name=data['name'], bank_id=bank_obj.id).first() # Mevcut hesabı tekrar çek
                        if not account: # Hala bulunamadıysa hata ver
                            print(f"Hata: Hesap '{data['name']}' bulunamadı veya eklenemedi, atlanıyor.", file=sys.stderr)
                            continue
                else:
                    print(f"Mevcut: Hesap '{data['name']}' ({data['bank_name']}) zaten var.")
                all_accounts[f"{data['bank_name']}-{data['name']}"] = account
            else:
                print(f"Uyarı: Banka '{data['bank_name']}' bulunamadı, '{data['name']}' hesabı eklenemedi.")
        
        db.session.commit() # Hesaplar için commit
        print("Hesaplar eklendi/kontrol edildi.")

        # --- 3. Günlük Bakiyeler (DailyBalances) ---
        today = date.today()
        yesterday = today - timedelta(days=1)
        two_days_ago = today - timedelta(days=2)
        three_days_ago = today - timedelta(days=3)
        four_days_ago = today - timedelta(days=4)
        tomorrow = today + timedelta(days=1)
        day_after_tomorrow = today + timedelta(days=2)

        daily_balance_records_to_add = []

        def add_balance_if_not_exists(bank_name, account_name, entry_date, morning_val, evening_val):
            account = all_accounts.get(f"{bank_name}-{account_name}")
            bank = all_banks.get(bank_name)
            if account and bank:
                existing_record = DailyBalance.query.filter_by(
                    account_id=account.id, entry_date=entry_date
                ).first()
                if not existing_record:
                    daily_balance_records_to_add.append(DailyBalance(
                        bank_id=bank.id,
                        account_id=account.id,
                        entry_date=entry_date,
                        morning_balance=Decimal(str(morning_val)) if morning_val is not None else None,
                        evening_balance=Decimal(str(evening_val)) if evening_val is not None else None
                    ))
                #else:
                #    print(f"Mevcut: Bakiye kaydı '{bank_name}-{account_name}' için {entry_date} tarihinde zaten var.")
            else:
                print(f"Uyarı: {bank_name}-{account_name} hesabı veya bankası bulunamadı, {entry_date} için bakiye eklenemedi.")


        # Akbank Ana Hesap
        add_balance_if_not_exists('Akbank', 'Ana Hesap', three_days_ago, 1100, 1150)
        add_balance_if_not_exists('Akbank', 'Ana Hesap', two_days_ago, 1200, 1250)
        add_balance_if_not_exists('Akbank', 'Ana Hesap', yesterday, 1500, 1550)
        add_balance_if_not_exists('Akbank', 'Ana Hesap', today, 1850, 1900)
        add_balance_if_not_exists('Akbank', 'Ana Hesap', tomorrow, 2000, 2050)
        add_balance_if_not_exists('Akbank', 'Ana Hesap', day_after_tomorrow, 2100, 2150)

        # Yapı Kredi Ticari Hesap (Gap Testi İçin: 2 gün önceki kayıt var, dün atlandı, bugün kayıt eklenecek)
        add_balance_if_not_exists('Yapı Kredi', 'Ticari Hesap', four_days_ago, 4900, 4950)
        add_balance_if_not_exists('Yapı Kredi', 'Ticari Hesap', two_days_ago, 5000, 5100)
        # yesterday (dün) için burada veri EKLEMİYORUZ - bu bir boşluk (gap) oluşturacak.
        add_balance_if_not_exists('Yapı Kredi', 'Ticari Hesap', today, 5300, 5400) # Bugün giriş yapıldığında, dün otomatik doldurulmalı.

        # Diğer hesaplar için de benzer şekilde veri ekleyebilirsiniz:
        add_balance_if_not_exists('Türkiye İş Bankası', 'Yatırım Hesabı', yesterday, 9500, 9550)
        add_balance_if_not_exists('Türkiye İş Bankası', 'Yatırım Hesabı', today, 9000, 9050)
        add_balance_if_not_exists('QNB', 'Vadesiz TL', today, 4800, 4850)
        add_balance_if_not_exists('Ziraat Bankası', 'Maaş Hesabı', today, 7500, 7550)
        add_balance_if_not_exists('Türkiye Finans Bankası', 'Bireysel Hesap', today, 3300, 3350)
        add_balance_if_not_exists('halkbank', 'Ticari Kredi', today, 1000, 1050)
        add_balance_if_not_exists('Vakıf Bank', 'Tarım Hesabı', today, 2000, 2050)
        add_balance_if_not_exists('TEB', 'Şirket Hesabı', today, 500, 550)


        db.session.add_all(daily_balance_records_to_add)
        db.session.commit() # Günlük bakiyeler için commit
        print("Günlük bakiyeler eklendi/kontrol edildi.")

        print("--- Veri Ekleme Tamamlandı ---")

    except IntegrityError as e:
        db.session.rollback()
        # pyodbc.IntegrityError hatası için daha detaylı bilgi: e.orig
        # e.orig[1] genellikle hata kodunu, e.orig[2] ise mesajı içerir.
        error_message = f"Veritabanı bütünlük hatası: {e.orig[2] if hasattr(e.orig, '__getitem__') and len(e.orig) > 2 else str(e)}"
        print(error_message, file=sys.stderr)
        sys.exit(1)
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"SQLAlchemy hatası: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        db.session.rollback()
        print(f"Beklenmedik hata: {e}", file=sys.stderr)
        sys.exit(1)