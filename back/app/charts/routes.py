from flask import Blueprint, request, jsonify
from sqlalchemy import func, text
from app.models import db, Payment, Expense, Income, IncomeReceipt
from datetime import datetime
from sqlalchemy.sql import literal_column

chart_bp = Blueprint('chart', __name__, url_prefix='/api/chart')

@chart_bp.route('/expense', methods=['GET'])
def get_expense_chart():
    try:
        start_date = request.args.get('date_start')
        end_date = request.args.get('date_end')
        group_by = request.args.get('group_by', 'day')  # 'day' or 'month'

        if not start_date or not end_date:
            return jsonify({"error": "Tarih parametreleri eksik"}), 400

        # MSSQL tarih formatları
        if group_by == 'day':
            payment_date_expr = literal_column("CONVERT(varchar, payment_date, 23)").label("date")
            expense_date_expr = literal_column("CONVERT(varchar, date, 23)").label("date")
        else:
            payment_date_expr = literal_column("FORMAT(payment_date, 'yyyy-MM')").label("date")
            expense_date_expr = literal_column("FORMAT(date, 'yyyy-MM')").label("date")

        # Ödenen giderler
        paid_query = db.session.query(
            payment_date_expr,
            func.sum(Payment.payment_amount).label("ödenen")
        ).filter(
            Payment.payment_date.between(start_date, end_date)
        ).group_by(payment_date_expr).all()

        # Kalan giderler
        remaining_query = db.session.query(
            expense_date_expr.label("date"),
            func.sum(Expense.remaining_amount).label("ödenecek")
        ).filter(
            Expense.date.between(start_date, end_date),
            Expense.status.in_(['UNPAID', 'PARTIALLY_PAID'])
        ).group_by(expense_date_expr).all()

        result = {}

        for row in paid_query:
            result[row.date] = {"date": row.date, "ödenen": float(row.ödenen or 0), "ödenecek": 0}

        for row in remaining_query:
            if row.date in result:
                result[row.date]["ödenecek"] = float(row.ödenecek or 0)
            else:
                result[row.date] = {"date": row.date, "ödenen": 0, "ödenecek": float(row.ödenecek or 0)}

        sorted_result = sorted(result.values(), key=lambda x: x["date"])
        return jsonify(sorted_result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


from sqlalchemy import cast, String

@chart_bp.route('/income', methods=['GET'])
def get_income_chart():
    try:
        date_start = request.args.get('date_start')
        date_end = request.args.get('date_end')
        group_by = request.args.get('group_by', 'day')

        if not date_start or not date_end:
            return jsonify({"error": "Tarih aralığı belirtilmeli"}), 400

        # MSSQL uyumlu tarih dönüşümleri
        if group_by == 'day':
            income_date_expr = literal_column("CONVERT(varchar, date, 23)").label("date")
        elif group_by == 'month':
            income_date_expr = literal_column("FORMAT(date, 'yyyy-MM')").label("date")
        else:
            return jsonify({"error": "Geçersiz group_by parametresi"}), 400

        # Alınan gelir
        received_query = db.session.query(
            income_date_expr,
            func.sum(Income.received_amount).label("alınan")
        ).filter(
            Income.date.between(date_start, date_end)
        ).group_by(income_date_expr).all()

        # Alınacak gelir
        remaining_query = db.session.query(
            income_date_expr,
            func.sum(Income.total_amount - Income.received_amount).label("alınacak")
        ).filter(
            Income.date.between(date_start, date_end)
        ).group_by(income_date_expr).all()

        # Sonuçları birleştir
        result = {}

        for row in received_query:
            result[row.date] = {"date": row.date, "alınan": float(row.alınan or 0), "alınacak": 0}

        for row in remaining_query:
            if row.date in result:
                result[row.date]["alınacak"] = float(row.alınacak or 0)
            else:
                result[row.date] = {"date": row.date, "alınan": 0, "alınacak": float(row.alınacak or 0)}

        sorted_result = sorted(result.values(), key=lambda x: x["date"])
        return jsonify(sorted_result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



