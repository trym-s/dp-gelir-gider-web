from decimal import Decimal
from sqlalchemy import desc, asc
from sqlalchemy.orm import joinedload
from .. import db
from ..models import Company, Income, IncomeStatus, IncomeReceipt
from ..errors import AppError


class CompanyService:
    """Şirket/Müşteri veritabanı işlemlerini yönetir."""

    def get_by_id(self, company_id: int) -> Company:
        company = Company.query.get(company_id)
        if not company:
            raise AppError(f"Company with id {company_id} not found.", 404)
        return company

    def get_all(self):
        return Company.query.order_by(Company.name).all()

    def create(self, data: dict) -> Company:
        if Company.query.filter_by(name=data['name']).first():
            raise AppError(f"Company with name '{data['name']}' already exists.", 409)

        new_company = Company(name=data['name'])
        db.session.add(new_company)
        db.session.commit()
        return new_company

    def update(self, company_id: int, data: dict) -> Company:
        company = self.get_by_id(company_id)
        new_name = data.get('name')
        if new_name and new_name != company.name:
            if Company.query.filter_by(name=new_name).first():
                raise AppError(f"Company with name '{new_name}' already exists.", 409)
            company.name = new_name
        db.session.commit()
        return company

    def delete(self, company_id: int) -> bool:
        company = self.get_by_id(company_id)
        db.session.delete(company)
        db.session.commit()
        return True


class IncomeService:
    def get_by_id(self, income_id: int) -> Income:
        income = Income.query.get(income_id)
        if not income:
            raise AppError(f"Income with id {income_id} not found.", 404)
        return income

    def get_all(self, filters: dict = None, sort_by: str = 'date', sort_order: str = 'desc', page: int = 1, per_page: int = 20):
        query = Income.query.options(
            joinedload(Income.company),
            joinedload(Income.region),
            joinedload(Income.account_name),
            joinedload(Income.budget_item)
        )
        valid_sort_columns = {'date': Income.date, 'total_amount': Income.total_amount, 'status': Income.status}
        sort_column = valid_sort_columns.get(sort_by, Income.date)
        query = query.order_by(desc(sort_column) if sort_order == 'desc' else asc(sort_column))
        return query.paginate(page=page, per_page=per_page, error_out=False)

    def create(self, data: dict) -> Income:
        new_income = Income(**data)
        new_income.received_amount = 0
        new_income.status = IncomeStatus.UNRECEIVED
        db.session.add(new_income)
        db.session.commit()
        return new_income

    def update(self, income_id: int, data: dict) -> Income:
        income = self.get_by_id(income_id)
        for key, value in data.items():
            setattr(income, key, value)
        db.session.commit()
        return income

    def delete(self, income_id: int) -> bool:
        income = self.get_by_id(income_id)
        db.session.delete(income)
        db.session.commit()
        return True



class IncomeReceiptService:
    @staticmethod
    def _recalculate_income_status(income: Income):
        if income.received_amount == income.total_amount:
            income.status = IncomeStatus.RECEIVED
        elif income.received_amount > income.total_amount:
            income.status = IncomeStatus.OVER_RECEIVED
        elif income.received_amount <= 0:
            income.status = IncomeStatus.UNRECEIVED
        else:
            income.status = IncomeStatus.PARTIALLY_RECEIVED

    def get_by_id(self, receipt_id: int) -> IncomeReceipt:
        receipt = IncomeReceipt.query.get(receipt_id)
        if not receipt:
            raise AppError(f"Receipt with id {receipt_id} not found.", 404)
        return receipt

    def get_all(self, filters: dict = None, sort_by: str = 'receipt_date', sort_order: str = 'desc'):
        """Tüm gelir makbuzlarını filtreleme ve sıralama seçenekleriyle getirir."""
        query = IncomeReceipt.query.options(
            joinedload(IncomeReceipt.income).options(
                joinedload(Income.company),
                joinedload(Income.region),
                joinedload(Income.account_name),
                joinedload(Income.budget_item)
            )
        )
        
        if filters:
            if 'date_start' in filters:
                query = query.filter(IncomeReceipt.receipt_date >= filters['date_start'])
            if 'date_end' in filters:
                query = query.filter(IncomeReceipt.receipt_date <= filters['date_end'])

        # Sıralama
        valid_sort_columns = {
            'receipt_date': IncomeReceipt.receipt_date,
            'receipt_amount': IncomeReceipt.receipt_amount
        }
        sort_column = valid_sort_columns.get(sort_by, IncomeReceipt.receipt_date)
        
        if sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
            
        return query.all()

    def create(self, income_id: int, data: dict) -> IncomeReceipt:
        receipt_amount = Decimal(data.get('receipt_amount', 0))
        if receipt_amount <= 0:
            raise AppError("Receipt amount must be positive.", 400)
        try:
            income = Income.query.with_for_update().get(income_id)
            if not income:
                raise AppError(f"Income with id {income_id} not found.", 404)
            new_receipt = IncomeReceipt(income_id=income.id, receipt_amount=receipt_amount, receipt_date=data['receipt_date'], notes=data.get('notes'))
            db.session.add(new_receipt)
            income.received_amount += new_receipt.receipt_amount
            self._recalculate_income_status(income)
            db.session.commit()
            return new_receipt
        except Exception as e:
            db.session.rollback()
            if isinstance(e, AppError): raise e
            raise AppError(f"Internal error on receipt creation: {e}", 500) from e

    def update(self, receipt_id: int, data: dict) -> IncomeReceipt:
        try:
            receipt = self.get_by_id(receipt_id)
            income = Income.query.with_for_update().get(receipt.income_id)
            old_amount = receipt.receipt_amount
            new_amount = Decimal(data.get('receipt_amount', old_amount))
            if new_amount <= 0:
                raise AppError("Receipt amount must be positive.", 400)
            income.received_amount = (income.received_amount - old_amount) + new_amount
            self._recalculate_income_status(income)
            receipt.receipt_amount = new_amount
            receipt.receipt_date = data.get('receipt_date', receipt.receipt_date)
            receipt.notes = data.get('notes', receipt.notes)
            db.session.commit()
            return receipt
        except Exception as e:
            db.session.rollback()
            if isinstance(e, AppError): raise e
            raise AppError(f"Internal error on receipt update: {e}", 500) from e

    def delete(self, receipt_id: int) -> bool:
        try:
            receipt = self.get_by_id(receipt_id)
            income = Income.query.with_for_update().get(receipt.income_id)
            income.received_amount -= receipt.receipt_amount
            self._recalculate_income_status(income)
            db.session.delete(receipt)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            if isinstance(e, AppError): raise e
            raise AppError(f"Internal error on receipt deletion: {e}", 500) from e

