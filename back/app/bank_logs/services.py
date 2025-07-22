# /back/app/bank_logs/services.py
from datetime import datetime
from app import db
from app.base_service import BaseService
from app.banks.models import Bank
from .models import BankLog, Period
from sqlalchemy.exc import IntegrityError
import logging

class BankLogService(BaseService):
    def __init__(self):
        super().__init__(BankLog)

    def get_all_logs_for_period(self, date_str, period_str):
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            period = Period(period_str)
        except (ValueError, TypeError):
            raise ValueError("Invalid date or period format.")

        banks = Bank.query.all()
        response_logs = []

        for bank in banks:
            log = self.model.query.filter_by(bank_id=bank.id, date=date, period=period).first()
            if log:
                response_logs.append(log)
            else:
                placeholder = {
                    "id": f"new-{bank.id}-{date_str}-{period_str}",
                    "bank_id": bank.id,
                    "date": date_str,
                    "period": period_str,
                    "amount_try": "0.00",
                    "amount_usd": "0.00",
                    "amount_eur": "0.00",
                    "rate_usd_try": None,
                    "rate_eur_try": None,
                    "bank": bank
                }
                response_logs.append(placeholder)
        return response_logs

    def create_or_update_log(self, data):
        required_fields = ['bank_id', 'date', 'period', 'amount_try', 'amount_usd', 'amount_eur']
        if not all(field in data for field in required_fields):
            raise ValueError("Missing required fields for creating or updating a bank log.")

        try:
            date_val = datetime.strptime(data['date'], '%Y-%m-%d').date()
            period_val = Period(data['period'])
            bank_id_val = int(data['bank_id'])
        except (ValueError, TypeError) as e:
            logging.error(f"Error parsing data for log update: {e}")
            raise ValueError("Invalid data format for date, period, or bank_id.")

        log = self.model.query.filter_by(
            bank_id=bank_id_val,
            date=date_val,
            period=period_val
        ).first()

        if log:
            log.amount_try = data['amount_try']
            log.amount_usd = data['amount_usd']
            log.amount_eur = data['amount_eur']
            log.rate_usd_try = data.get('rate_usd_try')
            log.rate_eur_try = data.get('rate_eur_try')
        else:
            log = self.model(
                bank_id=bank_id_val,
                date=date_val,
                period=period_val,
                amount_try=data['amount_try'],
                amount_usd=data['amount_usd'],
                amount_eur=data['amount_eur'],
                rate_usd_try=data.get('rate_usd_try'),
                rate_eur_try=data.get('rate_eur_try')
            )
            db.session.add(log)
        
        try:
            db.session.commit()
            return log
        except IntegrityError as e:
            db.session.rollback()
            logging.error(f"Database integrity error on log save: {e}")
            raise ValueError("Failed to save log due to a database constraint.")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Unexpected error on log save: {e}")
            raise

bank_log_service = BankLogService()