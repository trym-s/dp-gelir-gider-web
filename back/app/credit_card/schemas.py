# app/credit_card/schemas.py

from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import CreditCard, CardBrand, DailyCreditCardLimit

class CardBrandSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CardBrand
        load_instance = True
    id = fields.Int(dump_only=True)
    name = fields.Str()

class CreditCardSchema(SQLAlchemyAutoSchema):
    """Kredi Kartlarını listelemek ve oluşturmak için şema."""
    class Meta:
        model = CreditCard
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    account_id = fields.Int(required=True)
    card_brand_id = fields.Int(required=True)
    credit_card_limit = fields.Decimal(as_string=True, places=2, required=True)
    cash_advance_limit = fields.Decimal(as_string=True, places=2, required=True)
    statement_day = fields.Int(required=True, validate=validate.Range(min=1, max=28))
    due_day = fields.Int(required=True, validate=validate.Range(min=1, max=28))
    expiration_date = fields.Date(required=True)

    # --- ÖNEMLİ GÜVENLİK NOTU ---
    # Bu alanlar sadece kart oluşturulurken (load) kabul edilir,
    # API'den dışarıya (dump) ASLA gönderilmez.
    credit_card_no = fields.Str(required=True, load_only=True)
    cvc = fields.Str(required=True, load_only=True)

    # Sadece gösterim amaçlı, ilişkili alanlar
    account_name = fields.String(attribute="account.name", dump_only=True)
    bank_name = fields.String(attribute="account.bank.name", dump_only=True)
    brand_name = fields.String(attribute="brand.name", dump_only=True)

    # Servis katmanında dinamik olarak eklenecek alanlar
    status = fields.Str(dump_only=True)
    current_limit = fields.Decimal(as_string=True, places=2, dump_only=True, allow_none=True)
    statement_date_str = fields.Str(dump_only=True)
    due_date_str = fields.Str(dump_only=True)

class DailyCreditCardLimitSchema(SQLAlchemyAutoSchema):
    """Günlük Kredi Kartı Limiti verileri için şema."""
    class Meta:
        model = DailyCreditCardLimit
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    entry_date = fields.Date(format="%Y-%m-%d", required=True)
    morning_limit = fields.Decimal(as_string=True, allow_none=True)
    evening_limit = fields.Decimal(as_string=True, allow_none=True)

    # Pivot tabloda göstermek için
    credit_card_name = fields.String(attribute="credit_card.name", dump_only=True)

# Şema instance'ları
credit_card_schema = CreditCardSchema()
credit_cards_schema = CreditCardSchema(many=True)
card_brand_schema = CardBrandSchema()
card_brands_schema = CardBrandSchema(many=True)
daily_limit_schema = DailyCreditCardLimitSchema()
daily_limits_schema = DailyCreditCardLimitSchema(many=True)