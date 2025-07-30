import pytest
from app import create_app, db
from app.income.models import Income
from app.region.models import Region
from app.account_name.models import AccountName
from app.budget_item.models import BudgetItem
from app.customer.models import Company
from app.payment_type.models import PaymentType
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
            company = Company(name='Test Company')
            db.session.add(company)
            db.session.commit()
            yield client
            db.session.remove()
            db.drop_all()

def test_create_income(client):
    print("\n--- Running test_create_income ---")
    response = client.post('/api/incomes', json={
        'description': 'Test Income',
        'total_amount': 1000.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1,
        'company_id': 1
    })
    assert response.status_code == 201
    print("test_create_income: PASSED")

def test_get_all_incomes(client):
    print("\n--- Running test_get_all_incomes ---")
    client.post('/api/incomes', json={
        'description': 'Test Income 1',
        'total_amount': 1000.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1,
        'company_id': 1
    })
    client.post('/api/incomes', json={
        'description': 'Test Income 2',
        'total_amount': 2000.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1,
        'company_id': 1
    })
    response = client.get('/api/incomes')
    assert response.status_code == 200
    assert len(response.json['data']) == 2
    print("test_get_all_incomes: PASSED")

def test_get_income_by_id(client):
    print("\n--- Running test_get_income_by_id ---")
    response = client.post('/api/incomes', json={
        'description': 'Test Income',
        'total_amount': 1000.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1,
        'company_id': 1
    })
    income_id = response.json['id']
    response = client.get(f'/api/incomes/{income_id}')
    assert response.status_code == 200
    assert response.json['description'] == 'Test Income'
    print("test_get_income_by_id: PASSED")

def test_update_income(client):
    print("\n--- Running test_update_income ---")
    response = client.post('/api/incomes', json={
        'description': 'Test Income',
        'total_amount': 1000.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1,
        'company_id': 1
    })
    income_id = response.json['id']
    response = client.put(f'/api/incomes/{income_id}', json={'description': 'Updated Income'})
    assert response.status_code == 200
    assert response.json['description'] == 'Updated Income'
    print("test_update_income: PASSED")

def test_delete_income(client):
    print("\n--- Running test_delete_income ---")
    response = client.post('/api/incomes', json={
        'description': 'Test Income',
        'total_amount': 1000.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1,
        'company_id': 1
    })
    income_id = response.json['id']
    response = client.delete(f'/api/incomes/{income_id}')
    assert response.status_code == 204
    response = client.get(f'/api/incomes/{income_id}')
    assert response.status_code == 404
    print("test_delete_income: PASSED")
