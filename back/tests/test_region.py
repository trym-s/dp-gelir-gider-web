import pytest
from app import create_app, db
from app.region.models import Region

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def test_create_region(client):
    print("\n--- Running test_create_region ---")
    response = client.post('/api/regions/', json={'name': 'Test Region'})
    assert response.status_code == 201
    print("test_create_region: PASSED")

def test_get_all_regions(client):
    print("\n--- Running test_get_all_regions ---")
    client.post('/api/regions/', json={'name': 'Test Region 1'})
    client.post('/api/regions/', json={'name': 'Test Region 2'})
    response = client.get('/api/regions/')
    assert response.status_code == 200
    assert len(response.json) == 2
    print("test_get_all_regions: PASSED")

def test_update_region(client):
    print("\n--- Running test_update_region ---")
    response = client.post('/api/regions/', json={'name': 'Test Region'})
    region_id = response.json['id']
    response = client.put(f'/api/regions/{region_id}', json={'name': 'Updated Region'})
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Region'
    print("test_update_region: PASSED")

def test_delete_region(client):
    print("\n--- Running test_delete_region ---")
    response = client.post('/api/regions/', json={'name': 'Test Region'})
    region_id = response.json['id']
    response = client.delete(f'/api/regions/{region_id}')
    assert response.status_code == 200
    response = client.get(f'/api/regions/{region_id}')
    assert response.status_code == 404
    print("test_delete_region: PASSED")
