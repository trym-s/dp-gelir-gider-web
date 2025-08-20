# app/transactions/routes.py

from flask import Blueprint, request, jsonify
from app.errors import AppError
from app.transactions.services import (
    get_unified_transactions,
    get_unified_daily_entries,
    get_unified_activity_feed,
    get_dashboard_feed
)
from app.transactions.schemas import UnifiedTransactionSchema, UnifiedDailyEntrySchema, UnifiedActivitySchema
from app.logging_utils import route_logger, dinfo, dinfo_sampled  # structured logs (domain)

transactions_bp = Blueprint('transactions_api', __name__, url_prefix='/api/transactions')

schema = UnifiedTransactionSchema(many=True)
daily_entries_schema = UnifiedDailyEntrySchema(many=True)
activity_schema = UnifiedActivitySchema(many=True)
dashboard_schema = UnifiedActivitySchema(many=True) 

def _mask_params(d: dict, limit=120):
    """avoid log-bloat; truncate long values"""
    return {k: (v if len(str(v)) <= limit else f"{str(v)[:limit]}…") for k, v in d.items()}


def _validate_pagination(filters: dict):
    """turn bad page/per_page into a clean 400 instead of 500"""
    for key in ("page", "per_page"):
        if key in filters and filters[key] not in (None, ""):
            try:
                # keep ints; service can happily re-cast
                filters[key] = int(filters[key])
            except (TypeError, ValueError):
                raise AppError("page and per_page must be integers.", 400)

@transactions_bp.route('/recent-activities', methods=['GET'])
@route_logger
def list_recent_activities():
    """
    Ana sayfada gösterilecek son 5 birleşik olayı döndürür.
    """
    # 'limit' parametresini servis fonksiyonuna yolluyoruz
    filters = {'limit': 5}
    result = get_unified_activity_feed(filters)
    
    return jsonify({
        "data": activity_schema.dump(result['items'])
    }), 200

@transactions_bp.route('/dashboard-feed', methods=['GET'])
@route_logger
def get_main_dashboard_feed():
    """
    Ana sayfa için 3 farklı kaynaktan gelen birleşik akışı döndürür.
    """
    result = get_dashboard_feed()
    # Not: Basit bir dict döndürdüğümüz için şema kullanmadan da jsonify edebiliriz.
    # Ama tutarlılık için şema kullanalım.
    return jsonify({"data": dashboard_schema.dump(result['items'])}), 200

# YENİ: "Tümünü Gör" sayfası için sayfalanabilir olay akışı
@transactions_bp.route('/activities', methods=['GET'])
@route_logger
def list_all_activities():
    """
    Tüm birleşik olay akışını sayfalanmış olarak döndürür.
    """
    filters = request.args.to_dict(flat=True)
    _validate_pagination(filters)
    
    paginated = get_unified_activity_feed(filters)
    
    return jsonify({
        "data": activity_schema.dump(paginated.items),
        "pagination": {
            "total_pages": paginated.pages,
            "total_items": paginated.total,
            "current_page": paginated.page
        }
    }), 200
    
@transactions_bp.route('/', methods=['GET'], strict_slashes=False)
@route_logger
def list_transactions():
    """
    Unified transaction feed (payments, receipts, cc tx, loan payments).
    Logging:
      - route enter/exit sampling by decorator (GET)  [noise↓]
      - domain: filters (sampled) + result metrics (definitive)
    """
    filters = request.args.to_dict(flat=True)
    _validate_pagination(filters)

    masked = _mask_params(filters)
    dinfo_sampled("transactions.list.filters", params=masked)

    paginated = get_unified_transactions(filters)

    dinfo(
        "transactions.list.metrics",
        count=len(paginated.items),
        page=paginated.page,
        total_pages=paginated.pages,
        total_items=paginated.total,
    )

    return jsonify({
        "data": schema.dump(paginated.items),
        "pagination": {
            "total_pages": paginated.pages,
            "total_items": paginated.total,
            "current_page": paginated.page
        }
    }), 200


@transactions_bp.route('/daily-entries', methods=['GET'], strict_slashes=False)
@route_logger
def list_daily_entries():
    """
    Daily merged entries (balances, KMH risks, CC limits).
    Same logging strategy as above.
    """
    filters = request.args.to_dict(flat=True)
    _validate_pagination(filters)

    masked = _mask_params(filters)
    dinfo_sampled("transactions.daily.filters", params=masked)

    paginated = get_unified_daily_entries(filters)

    dinfo(
        "transactions.daily.metrics",
        count=len(paginated.items),
        page=paginated.page,
        total_pages=paginated.pages,
        total_items=paginated.total,
    )

    return jsonify({
        "data": daily_entries_schema.dump(paginated.items),
        "pagination": {
            "total_pages": paginated.pages,
            "total_items": paginated.total,
            "current_page": paginated.page
        }
    }), 200
    