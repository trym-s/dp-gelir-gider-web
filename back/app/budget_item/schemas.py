from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.budget_item.models import BudgetItem
from app import db

class BudgetItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BudgetItem
        sqla_session = db.session
        load_instance = True
        include_fk = True