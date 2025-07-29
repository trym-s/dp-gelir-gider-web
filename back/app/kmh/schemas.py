# app/kmh/schemas.py

from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import KmhLimit, DailyRisk

class KmhLimitSchema(SQLAlchemyAutoSchema):
    """
    KMH Limitlerini listelemek ve oluşturmak için şema.
    """
    class Meta:
        model = KmhLimit
        load_instance = True
        include_fk = True # account_id'nin dahil edilmesi için

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    kmh_limit = fields.Decimal(as_string=True, places=2, required=True)
    statement_day = fields.Int(required=True, validate=validate.Range(min=1, max=28))

    # İlişkili modellerden okunacak, sadece gösterim amaçlı alanlar
    account_name = fields.String(attribute="account.name", dump_only=True)
    bank_name = fields.String(attribute="account.bank.name", dump_only=True)

    # Servis katmanında dinamik olarak eklenecek alanlar
    status = fields.Str(dump_only=True)
    current_risk = fields.Decimal(as_string=True, places=2, dump_only=True, allow_none=True)
    statement_date_str = fields.Str(dump_only=True) # ör: "15.07.2025"

class DailyRiskSchema(SQLAlchemyAutoSchema):
    """
    Günlük Risk verileri için şema.
    """
    class Meta:
        model = DailyRisk
        load_instance = True
        include_fk = True # kmh_limit_id'nin dahil edilmesi için

    id = fields.Int(dump_only=True)
    entry_date = fields.Date(format="%Y-%m-%d", required=True)
    morning_risk = fields.Decimal(as_string=True, allow_none=True)
    evening_risk = fields.Decimal(as_string=True, allow_none=True)
    
    # Pivot tabloda göstermek için ilişkili modellerden veri çekme
    kmh_name = fields.String(attribute="kmh_limit.name", dump_only=True)
    account_name = fields.String(attribute="kmh_limit.account.name", dump_only=True)
    bank_name = fields.String(attribute="kmh_limit.account.bank.name", dump_only=True)


# Şema instance'ları
kmh_limit_schema = KmhLimitSchema()
kmh_limits_schema = KmhLimitSchema(many=True)
daily_risk_schema = DailyRiskSchema()
daily_risks_schema = DailyRiskSchema(many=True)