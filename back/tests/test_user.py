import pytest
from app import create_app, db
from app.user.models import User

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def test_register_user(client):
    print("\n--- Running test_register_user ---")
    response = client.post('/api/users/register', json={'username': 'testuser', 'password': 'password'})
    assert response.status_code == 201
    print("test_register_user: PASSED")

def test_login_user(client):
    print("\n--- Running test_login_user ---")
    client.post('/api/users/register', json={'username': 'testuser', 'password': 'password'})
    response = client.post('/api/users/login', json={'username': 'testuser', 'password': 'password'})
    assert response.status_code == 200
    assert 'access_token' in response.json
    print("test_login_user: PASSED")

def test_get_all_users(client):
    print("\n--- Running test_get_all_users ---")
    # Register a user and get a token
    client.post('/api/users/register', json={'username': 'admin', 'password': 'password', 'role': 1})
    login_response = client.post('/api/users/login', json={'username': 'admin', 'password': 'password'})
    token = login_response.json['access_token']
    
    client.post('/api/users/register', json={'username': 'testuser1', 'password': 'password'})
    client.post('/api/users/register', json={'username': 'testuser2', 'password': 'password'})
    
    response = client.get('/api/users/', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    # Including the admin user, there should be 3 users
    assert len(response.json) == 3
    print("test_get_all_users: PASSED")

def test_get_user_by_id(client):
    print("\n--- Running test_get_user_by_id ---")
    register_response = client.post('/api/users/register', json={'username': 'testuser', 'password': 'password'})
    user_id = register_response.json['id']
    login_response = client.post('/api/users/login', json={'username': 'testuser', 'password': 'password'})
    token = login_response.json['access_token']

    response = client.get(f'/api/users/{user_id}', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert response.json['username'] == 'testuser'
    print("test_get_user_by_id: PASSED")

def test_update_user(client):
    print("\n--- Running test_update_user ---")
    register_response = client.post('/api/users/register', json={'username': 'testuser', 'password': 'password'})
    user_id = register_response.json['id']
    login_response = client.post('/api/users/login', json={'username': 'testuser', 'password': 'password'})
    token = login_response.json['access_token']

    response = client.put(f'/api/users/{user_id}', json={'username': 'updateduser'}, headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert response.json['username'] == 'updateduser'
    print("test_update_user: PASSED")

def test_delete_user(client):
    print("\n--- Running test_delete_user ---")
    # Register an admin user to delete other users
    client.post('/api/users/register', json={'username': 'admin', 'password': 'password', 'role': 1})
    login_response = client.post('/api/users/login', json={'username': 'admin', 'password': 'password'})
    token = login_response.json['access_token']

    register_response = client.post('/api/users/register', json={'username': 'testuser', 'password': 'password'})
    user_id = register_response.json['id']

    response = client.delete(f'/api/users/{user_id}', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    
    # Verify user is deleted
    response = client.get(f'/api/users/{user_id}', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 404
    print("test_delete_user: PASSED")
