# back/app/bank_status/schemas.py
from marshmallow import fields
from marshmallow.validate import Length, Range
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import Bank, Account, DailyBalance # Tanımladığımız modelleri import ediyoruz

# --- Account için Şema ---
# Frontend'e hesap bilgilerini (ID, isim, IBAN, banka adı) göndermek için
# ve yeni hesap oluşturma/güncelleme girdilerini doğrulamak için kullanılabilir.
class AccountSchema(SQLAlchemyAutoSchema): # <-- DEĞİŞİKLİK BURADA!
    class Meta:
        model = Account
        load_instance = True

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=Length(min=1, max=255))
    bank_id = fields.Int(required=True)
    iban_number = fields.Str(required=True, validate=Length(min=15, max=34))

    bank_name = fields.Method("get_bank_name", dump_only=True)

    def get_bank_name(self, obj):
        return obj.bank.name if obj.bank else None

# --- DailyBalance için Şema ---
# Artık ma.SQLAlchemyAutoSchema yerine direkt SQLAlchemyAutoSchema kullanıyoruz
class DailyBalanceSchema(SQLAlchemyAutoSchema): # <-- DEĞİŞİKLİK BURADA!
    class Meta:
        model = DailyBalance
        load_instance = True

    id = fields.Int(dump_only=True)
    bank_id = fields.Int(required=True)
    account_id = fields.Int(required=True)
    entry_date = fields.Date(format="%Y-%m-%d", required=True)
    
    morning_balance = fields.Decimal(as_string=True, allow_none=True, places=2)
    evening_balance = fields.Decimal(as_string=True, allow_none=True, places=2)

    bank_name = fields.Method("get_bank_name", dump_only=True)
    account_name = fields.Method("get_account_name", dump_only=True)

    def get_bank_name(self, obj):
        return obj.account.bank.name if obj.account and obj.account.bank else None

    def get_account_name(self, obj):
        return obj.account.name if obj.account else None

# Şema instance'larını oluşturun (burada bir değişiklik yok)
account_schema = AccountSchema()
accounts_schema = AccountSchema(many=True)

daily_balance_schema = DailyBalanceSchema()
daily_balances_schema = DailyBalanceSchema(many=True)