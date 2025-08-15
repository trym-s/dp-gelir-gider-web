# app/transactions/routes.py

from flask import Blueprint, request, jsonify
from app.transactions.services import get_unified_transactions
from app.transactions.services import get_unified_transactions, get_unified_daily_entries
from app.transactions.schemas import UnifiedTransactionSchema, UnifiedDailyEntrySchema
transactions_bp = Blueprint('transactions_api', __name__, url_prefix='/api/transactions')
schema = UnifiedTransactionSchema(many=True)
daily_entries_schema = UnifiedDailyEntrySchema(many=True)

@transactions_bp.route('/', methods=['GET'], strict_slashes=False)
def list_transactions():
    try:
        filters = request.args.to_dict()
        paginated_transactions = get_unified_transactions(filters)

        return jsonify({
            "data": schema.dump(paginated_transactions.items),
            "pagination": {
                "total_pages": paginated_transactions.pages,
                "total_items": paginated_transactions.total,
                "current_page": paginated_transactions.page
            }
        }), 200
    except Exception as e:
        # Hata loglama
        print(f"ERROR in list_transactions: {e}") 
        return jsonify({"error": "An internal server error occurred."}), 500
    
@transactions_bp.route('/daily-entries', methods=['GET'], strict_slashes=False)
def list_daily_entries():
    try:
        filters = request.args.to_dict()
        paginated_entries = get_unified_daily_entries(filters)
        return jsonify({
            "data": daily_entries_schema.dump(paginated_entries.items),
            "pagination": { "total_pages": paginated_entries.pages, "total_items": paginated_entries.total, "current_page": paginated_entries.page }
        }), 200
    except Exception as e:
        print(f"ERROR in list_daily_entries: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500