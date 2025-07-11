from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Expense, ExpenseGroup

class ExpenseSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Expense
        load_instance = True
        include_fk = True
class ExpenseGroupSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ExpenseGroup
        load_instance = True