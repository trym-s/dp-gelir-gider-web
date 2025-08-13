from app import ma, db
from app.expense.models import Supplier

class SupplierSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Supplier
        load_instance = True
        sqla_session = db.session
