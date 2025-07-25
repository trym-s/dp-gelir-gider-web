# app/kmh_status/schemas.py
from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Account, KMHDefinition, DailyRisk

class KMHDefinitionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = KMHDefinition
        load_instance = True
    
    kmh_limit = fields.Decimal(as_string=True, places=2)

# --- DÜZELTME BURADA ---
class DailyRiskSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = DailyRisk
        load_instance = True
        # include_fk = True # Bu da bir yöntem ama açıkça belirtmek daha iyi

    # Alanları açıkça belirterek account_id'nin dahil edilmesini garantiliyoruz
    id = fields.Int(dump_only=True)
    account_id = fields.Int(required=True)
    entry_date = fields.Date()
    morning_risk = fields.Decimal(as_string=True, places=2, allow_none=True)
    evening_risk = fields.Decimal(as_string=True, places=2, allow_none=True)


# Frontend'deki KMH Kartları için özel birleştirilmiş şema
class KMHAccountSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Account
        load_instance = True

    id = fields.Int(dump_only=True)
    name = fields.Str()
    bank_name = fields.String(attribute="bank.name")
    
    status = fields.Str(dump_only=True)
    kmh_limit = fields.Decimal(attribute="kmh_definition.kmh_limit", as_string=True, places=2)
    statement_day = fields.Int(attribute="kmh_definition.statement_day")
    
    current_risk = fields.Decimal(as_string=True, places=2, allow_none=True)
    hesap_kesim_tarihi = fields.Str(dump_only=True)


kmh_definition_schema = KMHDefinitionSchema()
daily_risk_schema = DailyRiskSchema()
daily_risks_schema = DailyRiskSchema(many=True)
kmh_account_schema = KMHAccountSchema()
kmh_accounts_schema = KMHAccountSchema(many=True)