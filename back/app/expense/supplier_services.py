from app import db
from app.expense.models import Supplier

def get_all_suppliers():
    return Supplier.query.all()

def get_supplier_by_id(supplier_id):
    return Supplier.query.get(supplier_id)

def create_supplier(data):
    supplier = Supplier(name=data['name'])
    db.session.add(supplier)
    db.session.commit()
    return supplier

def update_supplier(supplier_id, data):
    supplier = Supplier.query.get(supplier_id)
    if supplier:
        supplier.name = data['name']
        db.session.commit()
    return supplier

def delete_supplier(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if supplier:
        db.session.delete(supplier)
        db.session.commit()
    return supplier
