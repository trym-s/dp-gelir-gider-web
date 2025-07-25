from decimal import Decimal
from sqlalchemy import desc, asc, func
from sqlalchemy.orm import joinedload
from .. import db
from ..models import Customer, Income, IncomeStatus, IncomeReceipt
from ..errors import AppError
from decimal import Decimal

class CustomerService:
    def get_by_id(self, customer_id: int) -> Customer:
        return Customer.query.get_or_404(customer_id)
    def get_all(self):
        return Customer.query.order_by(Customer.name).all()
    def create(self, data: dict) -> Customer:
        if Customer.query.filter_by(name=data['name']).first():
            raise AppError(f"Customer with name '{data['name']}' already exists.", 409)
        new_customer = Customer(name=data['name'])
        db.session.add(new_customer)
        db.session.commit()
        return new_customer

class IncomeService:
    def get_by_id(self, income_id: int) -> Income:
        return Income.query.get_or_404(income_id)

    def get_all(self, filters: dict = None, sort_by: str = 'issue_date', sort_order: str = 'desc', page: int = 1, per_page: int = 20):
        query = Income.query.options(
            joinedload(Income.customer), joinedload(Income.region),
            joinedload(Income.account_name), joinedload(Income.budget_item)
        )
        if filters:
            if term := filters.get('invoice_name'):
                query = query.filter(func.lower(Income.invoice_name).contains(f"%{term.lower()}%"))
            if start := filters.get('date_start'):
                query = query.filter(Income.issue_date >= start)
            if end := filters.get('date_end'):
                query = query.filter(Income.issue_date <= end)
        
        sort_column = getattr(Income, sort_by, Income.issue_date)
        order = desc(sort_column) if sort_order == 'desc' else asc(sort_column)
        return query.order_by(order).paginate(page=page, per_page=per_page, error_out=False)

    def create(self, income_object: Income) -> Income:
        if Income.query.filter_by(invoice_number=income_object.invoice_number).first():
            raise AppError(f"Fatura Numarası '{income_object.invoice_number}' zaten mevcut.", 409)
        income_object.status = IncomeStatus.UNRECEIVED
        return income_object
    
    

class IncomeReceiptService:
    @staticmethod
    def _recalculate_income_state(income: Income):
        total_received = db.session.query(func.sum(IncomeReceipt.receipt_amount)).filter(IncomeReceipt.income_id == income.id).scalar() or Decimal('0.00')
        income.received_amount = total_received
        if total_received >= income.total_amount:
            income.status = IncomeStatus.RECEIVED
        elif total_received > 0:
            income.status = IncomeStatus.PARTIALLY_RECEIVED
        else:
            income.status = IncomeStatus.UNRECEIVED
        latest_receipt = IncomeReceipt.query.filter_by(income_id=income.id).order_by(db.desc(IncomeReceipt.receipt_date)).first()
        income.last_receipt_date = latest_receipt.receipt_date if latest_receipt else None

    def create(self, income_id: int, receipt_object: IncomeReceipt) -> IncomeReceipt:
        try:
            income = Income.query.with_for_update().get(income_id)
            if not income:
                raise AppError(f"Gelir ID {income_id} bulunamadı.", 404)
            
            receipt_object.income_id = income.id
            db.session.add(receipt_object)
            db.session.flush()
            self._recalculate_income_state(income)
            db.session.commit()
            return receipt_object
        except Exception as e:
            db.session.rollback()
            raise AppError(f"Tahsilat oluşturulurken hata: {e}", 500) from e