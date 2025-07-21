import pytest
from app import create_app, db
from app.budget_item.models import BudgetItem
from app.account_name.models import AccountName
from app.payment_type.models import PaymentType
from app.region.models import Region

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
            yield client
            db.session.remove()
            db.drop_all()

def test_create_budget_item(client):
    print("\n--- Running test_create_budget_item ---")
    response = client.post('/api/budget-items/', json={'name': 'Test Budget Item', 'account_name_id': 1})
    assert response.status_code == 201
    print("test_create_budget_item: PASSED")

def test_get_all_budget_items(client):
    print("\n--- Running test_get_all_budget_items ---")
    client.post('/api/budget-items/', json={'name': 'Test Budget Item 1', 'account_name_id': 1})
    client.post('/api/budget-items/', json={'name': 'Test Budget Item 2', 'account_name_id': 1})
    response = client.get('/api/budget-items/')
    assert response.status_code == 200
    assert len(response.json) == 2
    print("test_get_all_budget_items: PASSED")

def test_update_budget_item(client):
    print("\n--- Running test_update_budget_item ---")
    response = client.post('/api/budget-items/', json={'name': 'Test Budget Item', 'account_name_id': 1})
    budget_item_id = response.json['id']
    response = client.put(f'/api/budget-items/{budget_item_id}', json={'name': 'Updated Budget Item'})
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Budget Item'
    print("test_update_budget_item: PASSED")

def test_delete_budget_item(client):
    print("\n--- Running test_delete_budget_item ---")
    response = client.post('/api/budget-items/', json={'name': 'Test Budget Item', 'account_name_id': 1})
    budget_item_id = response.json['id']
    response = client.delete(f'/api/budget-items/{budget_item_id}')
    assert response.status_code == 200
    response = client.get(f'/api/budget-items/{budget_item_id}')
    assert response.status_code == 404
    print("test_delete_budget_item: PASSED")
