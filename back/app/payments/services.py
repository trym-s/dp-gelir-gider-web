import sys
from decimal import Decimal
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import joinedload
from .. import db
from ..models import Payment, Expense, ExpenseStatus
from ..errors import AppError
from datetime import datetime

class PaymentService:
    """Ödeme ile ilgili tüm veritabanı işlemlerini ve iş mantığını yönetir."""

    @staticmethod
    def _recalculate_expense_status(expense: Expense):
        """Bir giderin kalan tutarına göre durumunu merkezi olarak yeniden hesaplar."""
        if expense.remaining_amount == 0:
            expense.status = ExpenseStatus.PAID.name
        elif expense.remaining_amount < 0:
            expense.status = ExpenseStatus.OVERPAID.name
        elif expense.remaining_amount >= expense.amount:
            expense.status = ExpenseStatus.UNPAID.name
        else:
            expense.status = ExpenseStatus.PARTIALLY_PAID.name

    def get_by_id(self, payment_id: int) -> Payment:
        """Tek bir ödemeyi ID ile getirir."""
        payment = Payment.query.get(payment_id)
        if not payment:
            raise AppError(f"Payment with id {payment_id} not found.", 404)
        return payment

    def create(self, expense_id: int, payment_data: dict) -> Payment:
        """Bir gidere yeni bir ödeme ekler ve gider durumunu günceller."""
        payment_amount = Decimal(payment_data.get('payment_amount', 0))
        if payment_amount <= 0:
            raise AppError("Payment amount must be positive.", 400)

        try:
            expense = Expense.query.with_for_update().get(expense_id)
            if not expense:
                raise AppError(f"Expense with id {expense_id} not found.", 404)
            if expense.remaining_amount <= 0:
                raise AppError(f"Expense is already {expense.status.lower()}.", 400)

            new_payment = Payment(
                expense_id=expense.id,
                payment_amount=payment_amount,
                payment_date=payment_data['payment_date'],
                description=payment_data.get('description')
            )
            db.session.add(new_payment)

            # Yan Etki: Gideri güncelle
            expense.remaining_amount -= new_payment.payment_amount
            PaymentService._recalculate_expense_status(expense)

            db.session.commit()
            return new_payment
        except Exception as e:
            db.session.rollback()
            if isinstance(e, AppError): raise e
            raise AppError(f"Internal error on payment creation: {e}", 500) from e

    def update(self, payment_id: int, data: dict) -> Payment:
        """Bir ödemeyi günceller ve ilişkili gider durumunu yeniden hesaplar."""
        try:
            payment = self.get_by_id(payment_id)
            expense = Expense.query.with_for_update().get(payment.expense_id)

            old_amount = payment.payment_amount
            new_amount = Decimal(data.get('payment_amount', old_amount))
            if new_amount <= 0:
                raise AppError("Payment amount must be positive.", 400)

            # Yan Etki: Gideri güncelle (eskiyi ekle, yeniyi çıkar)
            expense.remaining_amount = (expense.remaining_amount + old_amount) - new_amount
            PaymentService._recalculate_expense_status(expense)

            # Ödeme kaydını güncelle
            payment.payment_amount = new_amount
            payment.payment_date = data.get('payment_date', payment.payment_date)
            payment.notes = data.get('notes', payment.notes)

            db.session.commit()
            return payment
        except Exception as e:
            db.session.rollback()
            if isinstance(e, AppError): raise e
            raise AppError(f"Internal error on payment update: {e}", 500) from e

    def delete(self, payment_id: int) -> bool:
        """Bir ödemeyi siler ve ilişkili gider durumunu yeniden hesaplar."""
        try:
            payment = self.get_by_id(payment_id)
            expense = Expense.query.with_for_update().get(payment.expense_id)

            # Yan Etki: Gideri güncelle (silinen tutarı geri ekle)
            expense.remaining_amount += payment.payment_amount
            PaymentService._recalculate_expense_status(expense)

            db.session.delete(payment)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            if isinstance(e, AppError): raise e
            raise AppError(f"Internal error on payment deletion: {e}", 500) from e

    def get_all(self, filters: dict, page: int, per_page: int):
        """
        Tüm ödemeleri filtre, sıralama ve sayfalama ile getirir.
        Filtreler: 'expense_id', 'date_start', 'date_end'
        Sıralama: 'sort_by' (örn: 'payment_date'), 'sort_order' ('asc' veya 'desc')
        """
        query = Payment.query.options(
            joinedload(Payment.expense).joinedload(Expense.region),
            joinedload(Payment.expense).joinedload(Expense.payment_type),
            joinedload(Payment.expense).joinedload(Expense.account_name),
            joinedload(Payment.expense).joinedload(Expense.budget_item)
        )

        # Filtreleme
        if 'expense_id' in filters:
            query = query.filter(Payment.expense_id == filters['expense_id'])
        if 'date_start' in filters:
            start_date = datetime.strptime(filters['date_start'], '%Y-%m-%d').date()
            query = query.filter(Payment.payment_date >= start_date)
        if 'date_end' in filters:
            end_date = datetime.strptime(filters['date_end'], '%Y-%m-%d').date()
            query = query.filter(Payment.payment_date <= end_date)

        # Sıralama
        sort_by = filters.get('sort_by', 'payment_date')
        sort_order = filters.get('sort_order', 'desc')
        if hasattr(Payment, sort_by):
            if sort_order == 'desc':
                query = query.order_by(desc(sort_by))
            else:
                query = query.order_by(asc(sort_by))

        # Sayfalama
        return query.paginate(page=page, per_page=per_page, error_out=False)
