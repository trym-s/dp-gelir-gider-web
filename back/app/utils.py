from app import db

class BaseService:
    def __init__(self, model):
        self.model = model

    def get_all(self):
        return self.model.query.all()

    def get_by_id(self, obj_id):
        return self.model.query.get(obj_id)

    def create(self, obj_instance):
        """
        Creates a new object.
        Assumes obj_instance is a model instance created by the schema.
        """
        db.session.add(obj_instance)
        db.session.commit()
        return obj_instance

    def update(self, obj_id, validated_data):
        """
        Updates an existing object.
        validated_data is the model instance from the schema after loading.
        """
        obj_to_update = self.get_by_id(obj_id)
        if not obj_to_update:
            return None

        # The schema with load_instance=True returns a model object.
        # We can iterate over its attributes to update the existing object.
        for key, value in validated_data.__dict__.items():
            # Skip internal SQLAlchemy attributes and primary keys
            if not key.startswith('_') and key != 'id':
                setattr(obj_to_update, key, value)

        db.session.commit()
        return obj_to_update

    def delete(self, obj_id):
        obj = self.get_by_id(obj_id)
        if obj:
            db.session.delete(obj)
            db.session.commit()
        return obj