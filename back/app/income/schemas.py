from marshmallow import Schema, fields, validate, pre_load, EXCLUDE
from ..models import IncomeStatus

# --- Ortak Kullanım için Basit Şemalar ---
class NameOnlySchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)

class CompanySchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120))

# --- Ana Şemalar ---
class IncomeSchema(Schema):
    id = fields.Int(dump_only=True)
    description = fields.Str(required=True, validate=validate.Length(min=3))
    total_amount = fields.Decimal(as_string=True, places=2, required=True, validate=validate.Range(min=0.01))
    received_amount = fields.Decimal(as_string=True, places=2, dump_only=True)
    status = fields.Enum(IncomeStatus, by_value=False, dump_only=True)
    date = fields.Date(required=True)
    created_at = fields.DateTime(dump_only=True)
    
    # İlişkili nesneleri ID yerine tam nesne olarak ekliyoruz
    company = fields.Nested(CompanySchema, dump_only=True)
    region = fields.Nested(NameOnlySchema, dump_only=True)
    account_name = fields.Nested(NameOnlySchema, dump_only=True)
    budget_item = fields.Nested(NameOnlySchema, dump_only=True)

    # Yükleme (veri alma) için ID'leri hala bekliyoruz
    company_id = fields.Int(required=True, load_only=True)
    region_id = fields.Int(required=True, load_only=True)
    account_name_id = fields.Int(required=True, load_only=True)
    budget_item_id = fields.Int(required=True, load_only=True)

class IncomeUpdateSchema(Schema):
    """Gelir güncellerken gelen veriyi doğrular ve dönüştürür."""
    class Meta:
        # Şemada tanımlı olmayan alanları sessizce yoksay
        unknown = EXCLUDE

    description = fields.Str(required=False)
    total_amount = fields.Decimal(as_string=True, places=2, required=False, validate=validate.Range(min=0.01))
    date = fields.Date(required=False)
    region_id = fields.Int(required=False)
    account_name_id = fields.Int(required=False)
    budget_item_id = fields.Int(required=False)
    company_id = fields.Int(required=False)

    @pre_load
    def process_nested_ids(self, data, **kwargs):
        """Doğrulamadan önce 'company' gibi nesneleri 'company_id'ye dönüştürür."""
        nested_fields = ['company', 'region', 'account_name', 'budget_item']
        for field_name in nested_fields:
            if field_name in data and isinstance(data[field_name], dict) and 'id' in data[field_name]:
                id_field_name = f"{field_name}_id"
                data[id_field_name] = data[field_name]['id']
                del data[field_name]
        return data

class IncomeReceiptSchema(Schema):
    id = fields.Int(dump_only=True)
    receipt_amount = fields.Decimal(as_string=True, places=2, required=True, validate=validate.Range(min=0.01))
    receipt_date = fields.Date(required=True)
    notes = fields.Str(required=False, allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    
    # İlişkili 'income' nesnesini tam detaylarıyla ekliyoruz
    income = fields.Nested(IncomeSchema, dump_only=True)
    income_id = fields.Int(required=True, load_only=True)
