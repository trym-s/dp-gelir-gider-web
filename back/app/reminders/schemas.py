# app/reminders/schemas.py

from marshmallow import Schema, fields

class ReminderSchema(Schema):
    """
    Farklı türdeki hatırlatmaları standart bir JSON formatına dönüştürür.
    """
    id = fields.Str(dump_only=True)
    type = fields.Str(dump_only=True) # Örn: 'DAILY_ENTRY_MISSING', 'DUE_DATE_UPCOMING'
    title = fields.Str(dump_only=True)
    description = fields.Str(dump_only=True)
    due_date = fields.Date(format='%Y-%m-%d', dump_only=True, allow_none=True)
    # Frontend'de hangi sayfaya/modala yönlendireceğimizi bilmek için meta veri
    meta = fields.Dict(keys=fields.Str(), values=fields.Raw(), dump_only=True)