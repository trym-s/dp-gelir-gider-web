from app import ma
from .models import Loan, LoanType
from ..banks.schemas import BankAccountSchema

class LoanTypeSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = LoanType
        load_instance = True

loan_type_schema = LoanTypeSchema()
loan_types_schema = LoanTypeSchema(many=True)

class LoanSchema(ma.SQLAlchemyAutoSchema):
    bank_account = ma.Nested(BankAccountSchema)
    loan_type = ma.Nested(LoanTypeSchema)
    class Meta:
        model = Loan
        load_instance = True
        include_fk = True

loan_schema = LoanSchema()
loans_schema = LoanSchema(many=True)