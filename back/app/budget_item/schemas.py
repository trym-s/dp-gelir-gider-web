from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import BudgetItem

class BudgetItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BudgetItem
        load_instance = True
        include_fk = True
