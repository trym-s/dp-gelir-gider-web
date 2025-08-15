from app import db
from sqlalchemy.exc import SQLAlchemyError
import logging
from app.logging_decorator import log_service_call

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseService:
    def __init__(self, model):
        self.model = model
    
    @log_service_call
    def get_all(self):
        return self.model.query.all()

    def get_by_id(self, obj_id):
        return self.model.query.get(obj_id)

    def create(self, validated_data):
        """
        Creates a new object from validated schema data.
        The schema should return a model instance (load_instance=True).
        """
        try:
            db.session.add(validated_data)
            db.session.commit()
            return validated_data
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error on create for {self.model.__name__}: {e}", exc_info=True)
            raise

    def update(self, obj_id, validated_data):
        """
        Updates an existing object.
        validated_data is the model instance from the schema after loading.
        """
        obj_to_update = self.get_by_id(obj_id)
        if not obj_to_update:
            return None

        try:
            for key, value in validated_data.__dict__.items():
                if not key.startswith('_') and key != 'id' and value is not None:
                    setattr(obj_to_update, key, value)
            
            db.session.commit()
            return obj_to_update
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error on update for {self.model.__name__}: {e}", exc_info=True)
            raise

    def delete(self, obj_id):
        obj = self.get_by_id(obj_id)
        if obj:
            try:
                db.session.delete(obj)
                db.session.commit()
                return obj
            except SQLAlchemyError as e:
                db.session.rollback()
                logger.error(f"Database error on delete for {self.model.__name__}: {e}", exc_info=True)
                raise
        return None
