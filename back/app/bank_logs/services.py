# /back/app/bank_logs/services.py
import io
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from sqlalchemy.orm import joinedload
from datetime import datetime
from app import db
from app.base_service import BaseService
from app.banks.models import BankAccount, Bank
from .models import BankLog, Period
from ..banks.schemas import BankAccountSchema, BankSchema
from sqlalchemy.exc import IntegrityError
import logging
from decimal import Decimal
class BankLogService(BaseService):
    def __init__(self):
        super().__init__(BankLog)


    def get_all_logs_for_period(self, date_str, period_str):
        """
        Belirtilen tarih ve periyottaki tüm banka log'larını alır.
        Bir banka için log yoksa, boş bir şablon döndürülür.
        """
        try:
            # 'date' ve 'period' değişkenlerinin burada doğru şekilde tanımlandığından emin oluyoruz.
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            period = Period(period_str)
        except (ValueError, TypeError):
            raise ValueError("Geçersiz tarih veya periyot formatı.")

        banks = Bank.query.all()
        response_data = []
        bank_schema = BankSchema()

        for bank in banks:
            # Sorguda 'date' ve 'period' değişkenlerini kullanıyoruz.
            log = self.model.query.filter_by(bank_id=bank.id, date=date, period=period).first()
            
            bank_data = bank_schema.dump(bank)
            
            if log:
                # DÜZELTME: Yanıta tüm kur alanları eklendi.
                bank_data['log'] = {
                    "id": log.id,
                    "bank_id": log.bank_id,
                    "date": date_str,
                    "period": period_str,
                    "amount_try": str(log.amount_try),
                    "amount_usd": str(log.amount_usd),
                    "amount_eur": str(log.amount_eur),
                    "amount_aed": str(log.amount_aed),
                    "amount_gbp": str(log.amount_gbp),
                    "rate_usd_try": str(log.rate_usd_try) if log.rate_usd_try else None,
                    "rate_eur_try": str(log.rate_eur_try) if log.rate_eur_try else None,
                    "rate_aed_try": str(log.rate_aed_try) if log.rate_aed_try else None,
                    "rate_gbp_try": str(log.rate_gbp_try) if log.rate_gbp_try else None,
                }
            else:
                # DÜZELTME: Boş şablona da tüm kur alanları eklendi.
                placeholder = {
                    "id": f"new-{bank.id}-{date_str}-{period_str}",
                    "bank_id": bank.id,
                    "date": date_str,
                    "period": period_str,
                    "amount_try": "0.00",
                    "amount_usd": "0.00",
                    "amount_eur": "0.00",
                    "amount_aed": "0.00",
                    "amount_gbp": "0.00",
                    "rate_usd_try": None,
                    "rate_eur_try": None,
                    "rate_aed_try": None,
                    "rate_gbp_try": None,
                }
                bank_data['log'] = placeholder
            response_data.append(bank_data)
        return response_data

    def _prepare_log_from_data(self, data, existing_log=None):
        """Helper to parse data and return a log model instance."""
        required_fields = ['bank_id', 'date', 'period', 'amount_try', 'amount_usd', 'amount_eur', 'amount_aed', 'amount_gbp']
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required fields for creating or updating a bank log.")

        try:
            date_val = datetime.strptime(data['date'], '%Y-%m-%d').date()
            bank_id_val = int(data['bank_id'])
            
            period_str = data['period']
            if isinstance(period_str, str) and '.' in period_str:
                period_str = period_str.split('.')[-1]
            period_val = Period(period_str)

        except (ValueError, TypeError) as e:
            logging.error(f"Error parsing data for log update: {e}")
            raise ValueError(f"Invalid data format for date, period, or bank_id. Error: {e}")

        log = existing_log or self.model.query.filter_by(
            bank_id=bank_id_val,
            date=date_val,
            period=period_val
        ).first()

        attributes = {
            'amount_try': data['amount_try'],
            'amount_usd': data['amount_usd'],
            'amount_eur': data['amount_eur'],
            'amount_aed': data['amount_aed'],
            'amount_gbp': data['amount_gbp'],
            'rate_usd_try': data.get('rate_usd_try'),
            'rate_eur_try': data.get('rate_eur_try'),
            'rate_aed_try': data.get('rate_aed_try'),
            'rate_gbp_try': data.get('rate_gbp_try')
        }

        if log:
            for key, value in attributes.items():
                setattr(log, key, value)
        else:
            log = self.model(
                bank_id=bank_id_val,
                date=date_val,
                period=period_val,
                **attributes
            )
        return log

    def create_or_update_log(self, data, commit=True):
        """
        Creates or updates a single log. The commit can be deferred for batch operations.
        """
        log = self._prepare_log_from_data(data)
        if not log.id: # It's a new instance
            db.session.add(log)
        
        if commit:
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logging.error(f"Unexpected error on log save: {e}")
                raise
        return log

    def batch_upsert_logs(self, logs_data):
        """
        Creates or updates a list of bank logs in a single transaction.
        """
        if not isinstance(logs_data, list):
            raise ValueError("Input data must be a list of log objects.")

        updated_logs = []
        for data in logs_data:
            log = self._prepare_log_from_data(data)
            if not log.id: # It's a new instance, add to session
                db.session.add(log)
            updated_logs.append(log)
        
        try:
            db.session.commit()
            return updated_logs
        except Exception as e:
            db.session.rollback()
            logging.error(f"Unexpected error on batch log save: {e}")
            raise
    def generate_balance_excel(self, date_str):
        """
        Verilen tarihe göre banka bakiyelerini ve kurları alıp
        SABAH ve AKŞAM toplamlarını ayrı ayrı gösteren formatta Excel dosyası oluşturur.
        """
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("Geçersiz tarih formatı. Lütfen YYYY-MM-DD formatını kullanın.")

        logs = self.model.query.options(joinedload(BankLog.bank)).filter_by(date=target_date).order_by(BankLog.bank_id, BankLog.period).all()

        if not logs:
            raise ValueError("Seçilen tarih için görüntülenecek veri bulunamadı.")

        wb = Workbook()
        ws = wb.active
        ws.title = f"Bakiye Raporu {date_str}"

        # --- Başlık ve Stil Ayarları ---
        header_font = Font(bold=True)
        
        # --- Kur Bilgilerini Hazırlama ---
        first_valid_log = next((log for log in logs if log.rate_usd_try is not None), logs[0])
        rates = {
            'usd': first_valid_log.rate_usd_try or Decimal(0),
            'eur': first_valid_log.rate_eur_try or Decimal(0),
            'aed': first_valid_log.rate_aed_try or Decimal(0),
            'gbp': first_valid_log.rate_gbp_try or Decimal(0),
        }

        # --- YENİ: Sabah ve Akşam için Ayrı Ayrı Genel Toplam Hesaplamaları ---
        def get_period_totals(period_logs):
            totals = {
                'try': Decimal(0), 'usd': Decimal(0), 'eur': Decimal(0),
                'aed': Decimal(0), 'gbp': Decimal(0), 'in_try': Decimal(0)
            }
            for log in period_logs:
                totals['try'] += log.amount_try or Decimal(0)
                totals['usd'] += log.amount_usd or Decimal(0)
                totals['eur'] += log.amount_eur or Decimal(0)
                totals['aed'] += log.amount_aed or Decimal(0)
                totals['gbp'] += log.amount_gbp or Decimal(0)
            
            totals['in_try'] = (totals['try'] + 
                                (totals['usd'] * rates['usd']) +
                                (totals['eur'] * rates['eur']) +
                                (totals['aed'] * rates['aed']) +
                                (totals['gbp'] * rates['gbp']))
            return totals

        morning_grand_totals = get_period_totals([log for log in logs if log.period == Period.morning])
        evening_grand_totals = get_period_totals([log for log in logs if log.period == Period.evening])

        # --- Excel İçeriğini Oluşturma (YENİ FORMATA GÖRE) ---

        # Satır 1: Tarih Bilgisi
        ws['A1'] = "tarih"
        ws['B1'] = target_date.strftime('%d.%m.%Y')
        ws['A1'].font = header_font
        
        # Satır 3: TOPLAM BAKİYE (SABAH)
        ws.cell(row=5, column=1, value="TOPLAM BAKİYE").font = header_font
        ws.cell(row=5, column=2, value="SABAH").font = header_font
        ws.cell(row=5, column=3, value=morning_grand_totals['in_try'])
        ws.cell(row=5, column=4, value=morning_grand_totals['try'])
        ws.cell(row=5, column=5, value=morning_grand_totals['usd'])
        ws.cell(row=5, column=6, value=morning_grand_totals['eur'])
        ws.cell(row=5, column=7, value=morning_grand_totals['aed'])
        ws.cell(row=5, column=8, value=morning_grand_totals['gbp'])

        # Satır 4: TOPLAM BAKİYE (AKŞAM)
        ws.cell(row=6, column=1, value="TOPLAM BAKİYE").font = header_font
        ws.cell(row=6, column=2, value="AKŞAM").font = header_font
        ws.cell(row=6, column=3, value=evening_grand_totals['in_try'])
        ws.cell(row=6, column=4, value=evening_grand_totals['try'])
        ws.cell(row=6, column=5, value=evening_grand_totals['usd'])
        ws.cell(row=6, column=6, value=evening_grand_totals['eur'])
        ws.cell(row=6, column=7, value=evening_grand_totals['aed'])
        ws.cell(row=6, column=8, value=evening_grand_totals['gbp'])
            
        # Ana Tablo Başlıkları (Satır 6)
        ws.cell(row=3, column=1, value="Banka").font = header_font
        ws.cell(row=3, column=2, value="Vakit").font = header_font
        ws.cell(row=3, column=3, value="Toplam (TRY)").font = header_font
        ws.cell(row=3, column=4, value="TRY").font = header_font
        ws.cell(row=3, column=5, value="USD").font = header_font
        ws.cell(row=3, column=6, value="EUR").font = header_font
        ws.cell(row=3, column=7, value="AED").font = header_font
        ws.cell(row=3, column=8, value="GBP").font = header_font

        # Veri Satırlarını Doldurma
        def calculate_row_total(log):
            if not log: return Decimal(0)
            return ((log.amount_try or Decimal(0)) +
                    (log.amount_usd or Decimal(0)) * rates['usd'] +
                    (log.amount_eur or Decimal(0)) * rates['eur'] +
                    (log.amount_aed or Decimal(0)) * rates['aed'] +
                    (log.amount_gbp or Decimal(0)) * rates['gbp'])

        current_row = 7
        banks = sorted(list(set([log.bank for log in logs])), key=lambda b: b.id)
        for bank in banks:
            # Sabah Kaydı
            morning_log = next((log for log in logs if log.bank_id == bank.id and log.period == Period.morning), None)
            ws.cell(row=current_row, column=1, value=bank.name)
            ws.cell(row=current_row, column=2, value="sabah")
            ws.cell(row=current_row, column=3, value=calculate_row_total(morning_log))
            ws.cell(row=current_row, column=4, value=morning_log.amount_try if morning_log else 0)
            ws.cell(row=current_row, column=5, value=morning_log.amount_usd if morning_log else 0)
            ws.cell(row=current_row, column=6, value=morning_log.amount_eur if morning_log else 0)
            ws.cell(row=current_row, column=7, value=morning_log.amount_aed if morning_log else 0)
            ws.cell(row=current_row, column=8, value=morning_log.amount_gbp if morning_log else 0)
            current_row += 1

            # Akşam Kaydı
            evening_log = next((log for log in logs if log.bank_id == bank.id and log.period == Period.evening), None)
            ws.cell(row=current_row, column=1, value=bank.name)
            ws.cell(row=current_row, column=2, value="akşam")
            ws.cell(row=current_row, column=3, value=calculate_row_total(evening_log))
            ws.cell(row=current_row, column=4, value=evening_log.amount_try if evening_log else 0)
            ws.cell(row=current_row, column=5, value=evening_log.amount_usd if evening_log else 0)
            ws.cell(row=current_row, column=6, value=evening_log.amount_eur if evening_log else 0)
            ws.cell(row=current_row, column=7, value=evening_log.amount_aed if evening_log else 0)
            ws.cell(row=current_row, column=8, value=evening_log.amount_gbp if evening_log else 0)
            current_row += 1

        # Kurlar Bölümü
        ws.cell(row=6, column=10, value="Kurlar").font = header_font
        ws.cell(row=7, column=10, value="USD/TRY")
        ws.cell(row=8, column=10, value="EUR/TRY")
        ws.cell(row=9, column=10, value="AED/TRY")
        ws.cell(row=10, column=10, value="GBP/TRY")

        ws.cell(row=7, column=11, value=rates['usd'])
        ws.cell(row=8, column=11, value=rates['eur'])
        ws.cell(row=9, column=11, value=rates['aed'])
        ws.cell(row=10, column=11, value=rates['gbp'])

        # Sayı Formatlarını ve Sütun Genişliklerini Ayarla
        money_format = '#,##0.00'
        rate_format = '#,##0.0000'

        for row_idx in range(3, ws.max_row + 1):
            for col_idx in range(3, 9): # Sütun C'den H'ye kadar
                ws.cell(row=row_idx, column=col_idx).number_format = money_format
        
        for row_idx in range(7, 11): # Kur formatları
            ws.cell(row=row_idx, column=11).number_format = rate_format

        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].autosize = True

        # Excel dosyasını hafızada bir stream'e kaydet
        virtual_workbook = io.BytesIO()
        wb.save(virtual_workbook)
        virtual_workbook.seek(0)

        return virtual_workbook      
bank_log_service = BankLogService()
