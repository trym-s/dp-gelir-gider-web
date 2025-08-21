# app/transactions/schemas.py

from marshmallow import Schema, fields

class UnifiedTransactionSchema(Schema):
    """
    Birleşik sorgudan dönen verileri JSON'a dönüştürmek için kullanılan şema.
    (bank_or_company ve description alanları eklendi)
    """
    id = fields.Str(dump_only=True)
    date = fields.DateTime(format='%Y-%m-%dT%H:%M:%S', dump_only=True)
    category = fields.Str(dump_only=True)
    
    # DİKKAT: 'attribute' kullanarak Python objesindeki 'snake_case' ismini
    # JSON çıktısındaki 'camelCase' isme dönüştürüyoruz.
    invoiceNumber = fields.Str(dump_only=True, allow_none=True, attribute="invoice_number") 
    region = fields.Str(dump_only=True, allow_none=True)
    bank_or_company = fields.Str(dump_only=True, allow_none=True)
    description = fields.Str(dump_only=True, allow_none=True)
    
    amount = fields.Decimal(as_string=True, dump_only=True)
    currency = fields.Str(dump_only=True, allow_none=True)
    
class UnifiedDailyEntrySchema(Schema):
    id = fields.Str(dump_only=True)
    date = fields.Date(format='%Y-%m-%d', dump_only=True, attribute="entry_date")
    category = fields.Str(dump_only=True)
    bank_name = fields.Str(dump_only=True)
    account_name = fields.Str(dump_only=True)
    amount = fields.Decimal(as_string=True, dump_only=True)
    period = fields.Str(dump_only=True) # YENİ ALAN: 'Sabah' veya 'Akşam'
    
class UnifiedActivitySchema(Schema):
    """
    Tüm uygulama içi olayları standart bir formatta birleştirmek için kullanılır.
    (ALAN ADLARI GÜNCELLENDİ)
    """
    id = fields.Str(dump_only=True)
    event_date = fields.DateTime(format='%Y-%m-%dT%H:%M:%S', dump_only=True)
    category = fields.Str(dump_only=True)            # DEĞİŞTİ: event_type -> category
    description = fields.Str(dump_only=True)
    amount = fields.Decimal(as_string=True, dump_only=True, allow_none=True)
    currency = fields.Str(dump_only=True, allow_none=True)
    region = fields.Str(dump_only=True, allow_none=True)
    bank_or_company = fields.Str(dump_only=True)