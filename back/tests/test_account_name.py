import pytest
from app import create_app, db
from app.models import AccountName, PaymentType, Region

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
            yield client
            db.session.remove()
            db.drop_all()

def test_create_account_name(client):
    print("\n--- Running test_create_account_name ---")
    response = client.post('/api/account-names/', json={'name': 'Test Account Name', 'payment_type_id': 1})
    assert response.status_code == 201
    print("test_create_account_name: PASSED")

def test_get_all_account_names(client):
    print("\n--- Running test_get_all_account_names ---")
    client.post('/api/account-names/', json={'name': 'Test Account Name 1', 'payment_type_id': 1})
    client.post('/api/account-names/', json={'name': 'Test Account Name 2', 'payment_type_id': 1})
    response = client.get('/api/account-names/')
    assert response.status_code == 200
    assert len(response.json) == 2
    print("test_get_all_account_names: PASSED")

def test_update_account_name(client):
    print("\n--- Running test_update_account_name ---")
    response = client.post('/api/account-names/', json={'name': 'Test Account Name', 'payment_type_id': 1})
    account_name_id = response.json['id']
    response = client.put(f'/api/account-names/{account_name_id}', json={'name': 'Updated Account Name'})
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Account Name'
    print("test_update_account_name: PASSED")

def test_delete_account_name(client):
    print("\n--- Running test_delete_account_name ---")
    response = client.post('/api/account-names/', json={'name': 'Test Account Name', 'payment_type_id': 1})
    account_name_id = response.json['id']
    response = client.delete(f'/api/account-names/{account_name_id}')
    assert response.status_code == 200
    response = client.get(f'/api/account-names/{account_name_id}')
    assert response.status_code == 404
    print("test_delete_account_name: PASSED")
