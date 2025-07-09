from app import db
from app.models import Region

def test_create_region(client):
    response = client.post("/regions", json={"name": "Test Region"})
    assert response.status_code == 201
    data = response.get_json()
    assert data["name"] == "Test Region"

def test_get_regions(client):
    # Seed test data
    region = Region(name="Seed Region")
    db.session.add(region)
    db.session.commit()

    response = client.get("/regions")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["name"] == "Seed Region"

def test_update_region(client):
    # Seed data
    region = Region(name="Old Name")
    db.session.add(region)
    db.session.commit()

    response = client.put(f"/regions/{region.id}", json={"name": "New Name"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["name"] == "New Name"

def test_delete_region(client):
    # Seed data
    region = Region(name="To Delete")
    db.session.add(region)
    db.session.commit()

    response = client.delete(f"/regions/{region.id}")
    assert response.status_code == 200
    assert response.get_json()["message"] == "Region deleted"

    # Verify deletion
    deleted = Region.query.get(region.id)
    assert deleted is None
