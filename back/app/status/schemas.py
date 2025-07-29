# app/status/schemas.py

from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import StatusHistory

class StatusHistorySchema(SQLAlchemyAutoSchema):
    """
    Polimorfik StatusHistory modeli için şema.
    Tüm varlıkların (Account, KmhLimit, CreditCard) durum geçmişini yönetir.
    """
    class Meta:
        model = StatusHistory
        load_instance = True

    id = fields.Int(dump_only=True)
    
    # Hangi varlığa ait olduğunu belirtmek için zorunlu alanlar
    subject_id = fields.Int(required=True)
    subject_type = fields.Str(
        required=True, 
        validate=validate.OneOf(['account', 'kmh_limit', 'credit_card'])
    )

    # Durum bilgileri
    status = fields.Str(
        required=True,
        validate=validate.OneOf(['Aktif', 'Pasif', 'Blokeli']) # Olası durumlar
    )
    start_date = fields.Date(format="%Y-%m-%d", required=True)
    end_date = fields.Date(format="%Y-%m-%d", allow_none=True)
    reason = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)

# Şema instance'ları
status_history_schema = StatusHistorySchema()
status_histories_schema = StatusHistorySchema(many=True)