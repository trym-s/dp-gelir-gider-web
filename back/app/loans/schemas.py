from app import ma
from .models import Loan, LoanType, LoanStatus, LoanPayment, LoanPaymentType, LoanPaymentStatus, AmortizationSchedule
from ..banks.schemas import BankAccountSchema
from marshmallow import fields
from sqlalchemy import func
from app import db
from decimal import Decimal

error_messages = {
    "required": "Bu alan zorunludur.",
    "null": "Bu alan boş bırakılamaz.",
    "validator_failed": "Geçersiz değer."
}

class LoanTypeSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = LoanType
        load_instance = True

loan_type_schema = LoanTypeSchema()
loan_types_schema = LoanTypeSchema(many=True)

class AmortizationScheduleSchema(ma.SQLAlchemyAutoSchema):
    """
    Amortisman taksitlerini ve ödeme durumunu serileştirmek için şema.
    """
    status = fields.Method("get_status", dump_only=True)

    class Meta:
        model = AmortizationSchedule
        load_instance = True
        include_fk = True

    def get_status(self, obj):
        """
        Taksitin ödenip ödenmediğini belirler.
        'payment' ilişkisi üzerinden kontrol eder.
        """
        if obj.payment:
            return "Paid"
        return "Due"

amortization_schedule_schema = AmortizationScheduleSchema()
amortization_schedules_schema = AmortizationScheduleSchema(many=True)


class LoanPaymentSchema(ma.SQLAlchemyAutoSchema):
    payment_type = fields.Enum(LoanPaymentType)
    status = fields.Enum(LoanPaymentStatus)
    # Ödemenin hangi taksite ait olduğunu göstermek için yeni alan
    installment_number = fields.Int(attribute="amortization_schedule.installment_number", dump_only=True)
    
    class Meta:
        model = LoanPayment
        load_instance = True
        include_fk = True

loan_payment_schema = LoanPaymentSchema()
loan_payments_schema = LoanPaymentSchema(many=True)

class LoanSchema(ma.SQLAlchemyAutoSchema):
    
    bank_account_id = fields.Int(required=True, error_messages={"required": "Lütfen bir banka hesabı seçin."})
    loan_type_id = fields.Int(required=True, error_messages={"required": "Lütfen bir kredi türü seçin."})
    amount_drawn = fields.Decimal(required=True, error_messages={"required": "Lütfen çekilen tutarı girin."}, places=2)
    interest_rate = fields.Decimal(required=True, error_messages={"required": "Lütfen faiz oranını girin."}, places=4)
    term_months = fields.Int(required=True, error_messages={"required": "Lütfen vadeyi (ay olarak) girin."})
    start_date = fields.Date(required=True, error_messages={"required": "Lütfen bir başlangıç tarihi seçin."})

    bank_account = ma.Nested(BankAccountSchema)
    loan_type = ma.Nested(LoanTypeSchema)
    status = fields.Enum(LoanStatus, by_value=False)
    bsmv_rate = fields.Float()
    monthly_payment_amount = fields.Decimal(as_string=True)
    total_paid = fields.Method("get_total_paid", dump_only=True)

    class Meta:
        model = Loan
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at")

    def get_total_paid(self, obj):
        """Calculates the total amount paid for the loan."""
        total = db.session.query(
            func.sum(LoanPayment.amount_paid)
        ).filter(
            LoanPayment.loan_id == obj.id,
            LoanPayment.status != LoanPaymentStatus.REVERSED
        ).scalar()
        return total or Decimal('0.00')

loan_schema = LoanSchema()
loans_schema = LoanSchema(many=True)
