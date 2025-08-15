# app/transactions/schemas.py

from marshmallow import Schema, fields

class UnifiedTransactionSchema(Schema):
    """
    gelir ve giderler için
    Birleşik sorgudan dönen verileri JSON'a dönüştürmek için kullanılan şema.
    """
    id = fields.Str(dump_only=True)
    date = fields.DateTime(format='%Y-%m-%dT%H:%M:%S', dump_only=True)
    category = fields.Str(dump_only=True)
    invoiceNumber = fields.Str(dump_only=True, allow_none=True, attribute="invoice_number") 
    region = fields.Str(dump_only=True)
    counterparty = fields.Str(dump_only=True)
    amount = fields.Decimal(as_string=True, dump_only=True)
    
class UnifiedDailyEntrySchema(Schema):
    id = fields.Str(dump_only=True)
    date = fields.Date(format='%Y-%m-%d', dump_only=True, attribute="entry_date")
    category = fields.Str(dump_only=True)
    bank_name = fields.Str(dump_only=True)
    account_name = fields.Str(dump_only=True)
    amount = fields.Decimal(as_string=True, dump_only=True)
    period = fields.Str(dump_only=True) # YENİ ALAN: 'Sabah' veya 'Akşam'