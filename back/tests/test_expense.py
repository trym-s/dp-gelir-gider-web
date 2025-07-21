import pytest
from app import create_app, db
from app.expense.models import Expense
from app.region.models import Region
from app.payment_type.models import PaymentType
from app.account_name.models import AccountName
from app.budget_item.models import BudgetItem
import datetime

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Add dependencies for foreign key constraints
            region = Region(name='Test Region')
            db.session.add(region)
            db.session.commit()
            payment_type = PaymentType(name='Test Payment Type', region_id=region.id)
            db.session.add(payment_type)
            db.session.commit()
            account_name = AccountName(name='Test Account Name', payment_type_id=payment_type.id)
            db.session.add(account_name)
            db.session.commit()
            budget_item = BudgetItem(name='Test Budget Item', account_name_id=account_name.id)
            db.session.add(budget_item)
            db.session.commit()
            yield client
            db.session.remove()
            db.drop_all()

def test_create_expense(client):
    print("\n--- Running test_create_expense ---")
    response = client.post('/api/expenses/', json={
        'description': 'Test Expense',
        'amount': 100.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    assert response.status_code == 201
    print("test_create_expense: PASSED")

def test_get_all_expenses(client):
    print("\n--- Running test_get_all_expenses ---")
    client.post('/api/expenses/', json={
        'description': 'Test Expense 1',
        'amount': 100.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    client.post('/api/expenses/', json={
        'description': 'Test Expense 2',
        'amount': 200.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    response = client.get('/api/expenses/')
    assert response.status_code == 200
    assert len(response.json) == 2
    print("test_get_all_expenses: PASSED")

def test_get_expense_by_id(client):
    print("\n--- Running test_get_expense_by_id ---")
    response = client.post('/api/expenses/', json={
        'description': 'Test Expense',
        'amount': 100.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    expense_id = response.json['id']
    response = client.get(f'/api/expenses/{expense_id}')
    assert response.status_code == 200
    assert response.json['description'] == 'Test Expense'
    print("test_get_expense_by_id: PASSED")

def test_update_expense(client):
    print("\n--- Running test_update_expense ---")
    response = client.post('/api/expenses/', json={
        'description': 'Test Expense',
        'amount': 100.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    expense_id = response.json['id']
    response = client.put(f'/api/expenses/{expense_id}', json={'description': 'Updated Expense'})
    assert response.status_code == 200
    assert response.json['description'] == 'Updated Expense'
    print("test_update_expense: PASSED")

def test_delete_expense(client):
    print("\n--- Running test_delete_expense ---")
    response = client.post('/api/expenses/', json={
        'description': 'Test Expense',
        'amount': 100.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    expense_id = response.json['id']
    response = client.delete(f'/api/expenses/{expense_id}')
    assert response.status_code == 200
    response = client.get(f'/api/expenses/{expense_id}')
    assert response.status_code == 404
    print("test_delete_expense: PASSED")
