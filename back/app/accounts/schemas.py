# app/accounts/schemas.py

from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Account, DailyBalance # Güncellenmiş modelleri import ediyoruz

class AccountSchema(SQLAlchemyAutoSchema):
    """
    Vadesiz Hesapları listelemek ve oluşturmak için şema.
    """
    class Meta:
        model = Account
        load_instance = True
        include_fk = True # bank_id'nin yüklenmesi için

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1))
    
    # İlişkili modelden veri çekmek için
    bank_name = fields.String(attribute="bank.name", dump_only=True)
    
    # Servis katmanında dinamik olarak eklenecek alanlar (sadece listeleme için)
    status = fields.Str(dump_only=True)
    last_entry_date = fields.Date(dump_only=True, allow_none=True)
    last_evening_balance = fields.Decimal(as_string=True, dump_only=True, allow_none=True)

class DailyBalanceSchema(SQLAlchemyAutoSchema):
    """
    Günlük Bakiye verileri için şema.
    """
    class Meta:
        model = DailyBalance
        load_instance = True
        include_fk = True # account_id'nin yüklenmesi için
        
    id = fields.Int(dump_only=True)
    entry_date = fields.Date(format="%Y-%m-%d", required=True)
    morning_balance = fields.Decimal(as_string=True, allow_none=True)
    evening_balance = fields.Decimal(as_string=True, allow_none=True)

    # ## DEĞİŞİKLİK: bank_id artık bu modelde doğrudan olmadığı için,
    # ilgili account üzerinden banka ve hesap adını alıyoruz.
    bank_name = fields.String(attribute="account.bank.name", dump_only=True)
    account_name = fields.String(attribute="account.name", dump_only=True)
    
    # Bu alan, servis katmanında dinamik olarak eklenecek
    status = fields.Str(dump_only=True)

# Şema instance'ları
account_schema = AccountSchema()
accounts_schema = AccountSchema(many=True)
daily_balance_schema = DailyBalanceSchema()
daily_balances_schema = DailyBalanceSchema(many=True)