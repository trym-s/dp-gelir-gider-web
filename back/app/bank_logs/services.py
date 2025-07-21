# /back/app/bank_logs/services.py
from datetime import datetime
from app import db
from app.credit_cards.models import Bank
# ExchangeRateService import removed
from .models import BankaLog, Period

class BankaLogService:
    @staticmethod
    def get_all_bank_logs_for_period(tarih_str, period_str):
        try:
            tarih = datetime.strptime(tarih_str, '%Y-%m-%d').date()
            period = Period(period_str)
        except (ValueError, TypeError):
            raise ValueError("Geçersiz tarih veya periyot formatı.")

        banks = Bank.query.all()
        response_logs = []

        for bank in banks:
            log = BankaLog.query.filter_by(bank_id=bank.id, tarih=tarih, period=period).first()
            if log:
                response_logs.append(log.to_dict())
            else:
                response_logs.append({
                    "id": f"new-{bank.id}-{tarih_str}-{period_str}",
                    "bank_id": bank.id,
                    "tarih": tarih_str,
                    "period": period_str,
                    "try": 0,
                    "usd": 0,
                    "eur": 0,
                    "kur_usd_try": None,
                    "kur_eur_try": None,
                    "name": bank.name,
                    "logo": None
                })
        return response_logs

    @staticmethod
    def create_or_update_bank_log(data):
        balance_id = data.get('balanceId')
        
        required_fields = ['try', 'usd', 'eur']
        if not all(field in data for field in required_fields):
            raise ValueError("Eksik veri: try, usd, eur alanları zorunludur.")

        try:
            miktar_try = float(data['try'])
            miktar_usd = float(data['usd'])
            miktar_eur = float(data['eur'])
        except (ValueError, TypeError):
            raise ValueError("Geçersiz tutar formatı.")

        # Exchange rate logic is temporarily removed
        # kur_usd_try = None
        # kur_eur_try = None

        if isinstance(balance_id, str) and balance_id.startswith('new-'):
            try:
                _, bank_id_str, tarih_str, period_str = balance_id.split('-')
                bank_id = int(bank_id_str)
                tarih = datetime.strptime(tarih_str, '%Y-%m-%d').date()
                period = Period(period_str)
            except (ValueError, TypeError):
                raise ValueError("Geçersiz geçici ID formatı.")

            log_to_update = BankaLog.query.filter_by(bank_id=bank_id, tarih=tarih, period=period).first()
            if not log_to_update:
                log_to_update = BankaLog(bank_id=bank_id, tarih=tarih, period=period)
                db.session.add(log_to_update)
        else:
            log_to_update = BankaLog.query.get(balance_id)
            if not log_to_update:
                raise ValueError(f"ID'si {balance_id} olan kayıt bulunamadı.")

        log_to_update.miktar_try = miktar_try
        log_to_update.miktar_usd = miktar_usd
        log_to_update.miktar_eur = miktar_eur
        # We don't set the exchange rates for now
        # log_to_update.kur_usd_try = kur_usd_try
        # log_to_update.kur_eur_try = kur_eur_try
        
        db.session.commit()
        return log_to_update.to_dict()