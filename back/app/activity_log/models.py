# back/app/activity_log/models.py
from app import db
from datetime import datetime

class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    action = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    details = db.Column(db.Text)

    user = db.relationship('User', backref='activity_logs')

    def __repr__(self):
        return f'<ActivityLog {self.action} by User ID {self.user_id}>'
