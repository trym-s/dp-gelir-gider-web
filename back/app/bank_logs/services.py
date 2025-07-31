# /back/app/bank_logs/services.py
from datetime import datetime
from app import db
from app.base_service import BaseService
from app.banks.models import BankAccount, Bank
from .models import BankLog, Period
from ..banks.schemas import BankAccountSchema, BankSchema
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
        response_data = []
        bank_schema = BankSchema()

        for bank in banks:
            log = self.model.query.filter_by(bank_id=bank.id, date=date, period=period).first()
            
            bank_data = bank_schema.dump(bank)
            
            if log:
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
                }
            else:
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
            'rate_eur_try': data.get('rate_eur_try')
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

bank_log_service = BankLogService()
