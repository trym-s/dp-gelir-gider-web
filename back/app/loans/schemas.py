from app import ma
from .models import Loan, LoanType, LoanStatus, LoanPayment, LoanPaymentType, LoanPaymentStatus, AmortizationSchedule
from ..banks.schemas import BankAccountSchema
from marshmallow import fields

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
    bank_account = ma.Nested(BankAccountSchema)
    loan_type = ma.Nested(LoanTypeSchema)
    status = fields.Enum(LoanStatus, by_value=True)
    # `payments` ilişkisi artık gerekli değil, çünkü ödeme planı üzerinden yönetilecek
    # payments = ma.Nested(loan_payments_schema, many=True, dump_only=True)
    bsmv_rate = fields.Float()
    monthly_payment_amount = fields.Decimal(as_string=True)

    class Meta:
        model = Loan
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at")

loan_schema = LoanSchema()
loans_schema = LoanSchema(many=True)
