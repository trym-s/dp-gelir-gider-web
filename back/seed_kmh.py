# seed_kmh.py
import os
from datetime import date, timedelta
from decimal import Decimal
from app import create_app, db
from app.models import Bank, Account, AccountType, KMHDefinition, DailyRisk, AccountStatusHistory

# Flask uygulama bağlamını oluştur
app = create_app(os.getenv('FLASK_CONFIG') or 'default')
app.app_context().push()

def seed_data():
    """Veritabanına KMH test verilerini ekler."""
    print("KMH test verileri ekleniyor...")

    try:
        # --- 1. Test için Bankaları ve Hesapları Bulalım ---
        akbank = Bank.query.filter_by(name='Akbank').first()
        yapikredi = Bank.query.filter_by(name='Yapı Kredi').first()

        if not akbank or not yapikredi:
            print("Hata: 'Akbank' veya 'Yapı Kredi' bulunamadı. Lütfen önce bu bankaları ekleyin.")
            return

        # --- 2. Yeni KMH Hesapları Oluşturalım ---
        # Akbank için KMH Hesabı
        akbank_kmh_account = Account.query.filter_by(name='KMH Hesabı (Akbank)').first()
        if not akbank_kmh_account:
            akbank_kmh_account = Account(
                name='KMH Hesabı (Akbank)',
                bank_id=akbank.id,
                account_type=AccountType.KMH
            )
            db.session.add(akbank_kmh_account)
            print("Akbank için KMH hesabı oluşturuldu.")

        # Yapı Kredi için KMH Hesabı
        yapikredi_kmh_account = Account.query.filter_by(name='KMH Hesabı (Yapı Kredi)').first()
        if not yapikredi_kmh_account:
            yapikredi_kmh_account = Account(
                name='KMH Hesabı (Yapı Kredi)',
                bank_id=yapikredi.id,
                account_type=AccountType.KMH
            )
            db.session.add(yapikredi_kmh_account)
            print("Yapı Kredi için KMH hesabı oluşturuldu.")

        # Değişiklikleri veritabanına yansıtarak ID'lerin oluşmasını sağla
        db.session.commit()

        # --- 3. KMH Tanımlarını Ekleyelim ---
        if not KMHDefinition.query.filter_by(account_id=akbank_kmh_account.id).first():
            akbank_kmh_def = KMHDefinition(
                account_id=akbank_kmh_account.id,
                kmh_limit=Decimal('150000.00'),
                statement_day=25
            )
            db.session.add(akbank_kmh_def)
            print("Akbank KMH tanımı eklendi.")

        if not KMHDefinition.query.filter_by(account_id=yapikredi_kmh_account.id).first():
            yapikredi_kmh_def = KMHDefinition(
                account_id=yapikredi_kmh_account.id,
                kmh_limit=Decimal('200000.00'),
                statement_day=15
            )
            db.session.add(yapikredi_kmh_def)
            print("Yapı Kredi KMH tanımı eklendi.")

        # --- 4. Günlük Risk Verileri Ekleyelim ---
        today = date.today()
        # Akbank için riskler
        risks_akbank = [
            DailyRisk(account_id=akbank_kmh_account.id, entry_date=today - timedelta(days=2), morning_risk=Decimal('12000.50'), evening_risk=Decimal('12500.75')),
            DailyRisk(account_id=akbank_kmh_account.id, entry_date=today - timedelta(days=1), morning_risk=Decimal('12500.75'), evening_risk=Decimal('15000.00')),
        ]
        # Yapı Kredi için riskler
        risks_yapikredi = [
            DailyRisk(account_id=yapikredi_kmh_account.id, entry_date=today - timedelta(days=1), morning_risk=Decimal('5000.00'), evening_risk=Decimal('5250.00')),
        ]
        
        for risk in risks_akbank + risks_yapikredi:
            if not DailyRisk.query.filter_by(account_id=risk.account_id, entry_date=risk.entry_date).first():
                db.session.add(risk)
        print("Günlük risk verileri eklendi.")

        # --- 5. Durum Geçmişi Ekleyelim ---
        if not AccountStatusHistory.query.filter_by(account_id=yapikredi_kmh_account.id, status='Pasif').first():
            status_passive = AccountStatusHistory(
                account_id=yapikredi_kmh_account.id,
                status='Pasif',
                start_date=today - timedelta(days=10),
                reason='Test için pasife alındı'
            )
            db.session.add(status_passive)
            print("Yapı Kredi KMH için 'Pasif' durum geçmişi eklendi.")

        db.session.commit()
        print("Tüm KMH test verileri başarıyla eklendi!")

    except Exception as e:
        db.session.rollback()
        print(f"Bir hata oluştu: {e}")

if __name__ == '__main__':
    seed_data()
