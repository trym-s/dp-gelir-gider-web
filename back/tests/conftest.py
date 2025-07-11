import pytest
from app import create_app, db

@pytest.fixture(scope='module')
def app():
    app = create_app()
    app.config.update({
        "TESTING": True
    })
    with app.app_context():
        yield app

@pytest.fixture(scope='module')
def client(app):
    return app.test_client()
