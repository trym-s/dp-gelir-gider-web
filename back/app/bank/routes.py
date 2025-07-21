from flask import Blueprint, request, jsonify
from app.models import Bank, BankLog
from .schemas import BankSchema, BankLogSchema
from app import db
from datetime import datetime

bank_bp = Blueprint('bank', __name__, url_prefix='/api/bank')


@bank_bp.route('/list', methods=['GET'])
def list_banks():
    try:
        banks = Bank.query.all()
        schema = BankSchema(many=True)
        return jsonify(schema.dump(banks)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bank_bp.route('/logs', methods=['GET'])
def list_logs():
    try:
        date_str = request.args.get('date')
        if not date_str:
            return jsonify({'error': 'Date is required'}), 400

        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        logs = BankLog.query.filter_by(date=date).all()

        schema = BankLogSchema(many=True)
        return jsonify(schema.dump(logs)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bank_bp.route('/log', methods=['POST'])
def add_or_update_log():
    try:
        data = request.get_json()
        print("🎯 Gelen veri:", data)

        # Alanları boşsa ekle (boşsa bile gönderilmeye devam edebilir frontend)
        for field in [
            'morning_amount_try', 'evening_amount_try',
            'morning_amount_usd', 'evening_amount_usd',
            'morning_amount_eur', 'evening_amount_eur'
        ]:
            data.setdefault(field, None)

        existing_log = BankLog.query.filter_by(
            bank_id=data['bank_id'],
            date=datetime.strptime(data['date'], '%Y-%m-%d').date()
        ).first()

        if existing_log:
            # Sadece gelen alanlar güncelleniyor
            for field in [
                'morning_amount_try', 'evening_amount_try',
                'morning_amount_usd', 'evening_amount_usd',
                'morning_amount_eur', 'evening_amount_eur'
            ]:
                if data[field] is not None:
                    setattr(existing_log, field, data[field])
        else:
            schema = BankLogSchema()
            new_log = schema.load(data, session=db.session)
            db.session.add(new_log)

        db.session.commit()
        return jsonify({"message": "Başarılı"}), 201

    except Exception as e:
        import traceback
        print("🔥 HATA:", traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bank_bp.route('', methods=['POST'])
def create_bank():
    try:
        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({'error': 'Name is required'}), 400

        existing = Bank.query.filter_by(name=name).first()
        if existing:
            return jsonify({'error': 'Bank with this name already exists'}), 400

        new_bank = Bank(name=name)
        db.session.add(new_bank)
        db.session.commit()

        schema = BankSchema()
        return jsonify(schema.dump(new_bank)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bank_bp.route('/<int:bank_id>', methods=['DELETE'])
def delete_bank(bank_id):
    try:
        bank = Bank.query.get(bank_id)
        if not bank:
            return jsonify({'error': 'Bank not found'}), 404

        db.session.delete(bank)
        db.session.commit()
        return jsonify({'message': 'Bank deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500