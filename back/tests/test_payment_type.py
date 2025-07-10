import pytest
from app import create_app, db
from app.models import PaymentType, Region

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Add a region for foreign key constraint
            region = Region(name='Test Region')
            db.session.add(region)
            db.session.commit()
            yield client
            db.session.remove()
            db.drop_all()

def test_create_payment_type(client):
    print("\n--- Running test_create_payment_type ---")
    response = client.post('/api/payment-types/', json={'name': 'Test Payment Type', 'region_id': 1})
    assert response.status_code == 201
    print("test_create_payment_type: PASSED")

def test_get_all_payment_types(client):
    print("\n--- Running test_get_all_payment_types ---")
    client.post('/api/payment-types/', json={'name': 'Test Payment Type 1', 'region_id': 1})
    client.post('/api/payment-types/', json={'name': 'Test Payment Type 2', 'region_id': 1})
    response = client.get('/api/payment-types/')
    assert response.status_code == 200
    assert len(response.json) == 2
    print("test_get_all_payment_types: PASSED")

def test_update_payment_type(client):
    print("\n--- Running test_update_payment_type ---")
    response = client.post('/api/payment-types/', json={'name': 'Test Payment Type', 'region_id': 1})
    payment_type_id = response.json['id']
    response = client.put(f'/api/payment-types/{payment_type_id}', json={'name': 'Updated Payment Type'})
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Payment Type'
    print("test_update_payment_type: PASSED")

def test_delete_payment_type(client):
    print("\n--- Running test_delete_payment_type ---")
    response = client.post('/api/payment-types/', json={'name': 'Test Payment Type', 'region_id': 1})
    payment_type_id = response.json['id']
    response = client.delete(f'/api/payment-types/{payment_type_id}')
    assert response.status_code == 200
    response = client.get(f'/api/payment-types/{payment_type_id}')
    assert response.status_code == 404
    print("test_delete_payment_type: PASSED")
