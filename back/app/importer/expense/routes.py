
# back/app/importer/expense/routes.py
from __future__ import annotations
import io, os, time, uuid, tempfile, traceback, datetime
from typing import List, Dict, Any, Optional
from enum import Enum
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from app import db  # app context vars
from app.importer.expense.normalize_expense import build_preview
from app.importer.expense.plan_from_preview import plan_many, Defaults
from app.importer.expense.commit_from_review import commit_many
from app.importer.expense.plan_summary import build_plan_summary, _resolve_account_and_budget
from app.importer.expense.hierarchy import load_catalog
from decimal import Decimal

expense_import_bp= Blueprint("importer_expense", __name__, url_prefix="/api/import/expense")

# naive in-memory store (prod'da Redis önerilir)
_PREVIEWS: Dict[str, Dict[str, Any]] = {}
_TTL_SEC = 60 * 30  # 30 dk

def _now() -> float: return time.time()

def _gc():
    now = _now()
    to_del = [k for k, v in _PREVIEWS.items() if now - v.get("_ts", 0) > _TTL_SEC]
    for k in to_del:
        _PREVIEWS.pop(k, None)

def _safe_int(value: Any) -> Optional[int]:
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

@expense_import_bp.route("/preview", methods=["POST"])
def upload_preview():
    """
    multipart/form-data:
      - file: xlsx
      - sheet: (opsiyonel) sheet adı veya index
    Döner: { preview_id, count, sample }
    """
    _gc()
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "file is required"}), 400

    # isteğe bağlı sheet
    sheet = request.form.get("sheet")
    try:
        if sheet is not None and sheet.isdigit():
            sheet = int(sheet)
    except Exception:
        pass

    # temp kaydet -> build_preview -> sil
    filename = secure_filename(file.filename or "upload.xlsx")
    fd, tmp = tempfile.mkstemp(prefix="exp_", suffix="_" + filename)
    os.close(fd)
    try:
        file.save(tmp)
        preview = build_preview(tmp, sheet=sheet)   # xlsx → normalized list
        # store
        pid = uuid.uuid4().hex
        _PREVIEWS[pid] = {"_ts": _now(), "data": preview}
        return jsonify({
            "preview_id": pid,
            "count": preview.get("count", 0),
            "sample": (preview.get("expenses") or [])[:5],
        }), 200
    finally:
        try: os.remove(tmp)
        except OSError: pass

@expense_import_bp.route("/preview/<pid>", methods=["GET"])
def get_preview(pid: str):
    """
    Query params:
      - page (default=1), size (default=50)
    Döner: { items, total, page, size }
    """
    _gc()
    item = _PREVIEWS.get(pid)
    if not item:
        return jsonify({"error": "preview not found or expired"}), 404
    exps: List[Dict[str, Any]] = item["data"].get("expenses") or []
    total = len(exps)
    try:
        page = int(request.args.get("page", "1"))
        size = int(request.args.get("size", "50"))
    except ValueError:
        return jsonify({"error": "invalid page/size"}), 400
    page = max(1, page)
    size = max(1, min(size, 500))
    start = (page - 1) * size
    end = start + size
    return jsonify({
        "items": exps[start:end],
        "total": total,
        "page": page,
        "size": size,
    }), 200

def _json_safe(x):
    # Recursively convert to JSON-serializable primitives
    if isinstance(x, Decimal):
        return float(x)
    if isinstance(x, (datetime.date, datetime.datetime)):
        return x.isoformat()
    if isinstance(x, Enum):
        return x.name
    if isinstance(x, dict):
        return {str(k): _json_safe(v) for k, v in x.items()}  # anahtarları stringe çek
    if isinstance(x, (list, tuple, set)):
        return [_json_safe(i) for i in x]
    # SQLAlchemy Row / Model vs. geldi ise:
    try:
        # Row/RowMapping için _mapping attribute'u varsa dict'e çevir
        from sqlalchemy.engine import Row
        if isinstance(x, Row):  # type: ignore
            return _json_safe(dict(x._mapping))
    except Exception:
        pass
    return x

@expense_import_bp.route("/plan", methods=["POST"])
def plan_import():
    try:    
        body = request.get_json(force=True, silent=True) or {}
        pid = body.get("preview_id")
        indices = body.get("indices") or []
        defaults = body.get("defaults") or {}
        options  = body.get("options")  or {}  # 🔸 yeni
    
        _gc()
        item = _PREVIEWS.get(pid)
        if not item:
            return jsonify({"error": "preview not found or expired"}), 404

        exps = item["data"].get("expenses") or []
        sel  = [exps[i] for i in indices if 0 <= i < len(exps)]
        d = Defaults(
            region_id=int(defaults.get("region_id", 1)),
            payment_type_id=int(defaults.get("payment_type_id", 0)) or None,
            budget_item_id=int(defaults.get("budget_item_id", 0)) or None,
        )
        plan = plan_many(sel, d)

        # katalog + hiyerarşi çözümleme
        catalog = load_catalog(d.region_id)
        audit = build_plan_summary(
            sel,
            allow_negative_adjustment=bool(options.get("allow_negative_adjustment", False)),
            simulate_amount_update=bool(options.get("update_amount_if_changed", False)),
        )
        resolve = _resolve_account_and_budget(
            sel, d.region_id, d.payment_type_id, d.budget_item_id, catalog
        )
        payload = {
                "defaults": d.__dict__,
                **plan,
                **audit,
                "catalog": catalog,          
                "hierarchy": resolve,   
            }
        return jsonify(_json_safe(payload)), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "plan_failed", "detail": str(e)}), 500

@expense_import_bp.route("/commit", methods=["POST"])
def commit_import():
    import traceback
    try:
        body = request.get_json(force=True, silent=True) or {}

        # 1) İki input biçimini de destekle:
        #    a) { preview_id, indices, options, overrides }
        #    b) { records | selected, options, overrides }
        pid = body.get("preview_id")
        indices = body.get("indices") or []
        explicit = body.get("records") or body.get("selected")

        sel: List[Dict[str, Any]] = []
        if explicit:
            # Doğrudan kayıt listesi geldi
            sel = list(explicit)
        elif pid:
            # Preview store'dan seçimi derle
            _gc()
            item = _PREVIEWS.get(pid)
            if not item:
                return jsonify({"error": "preview not found or expired"}), 404
            exps: List[Dict[str, Any]] = item["data"].get("expenses") or []
            sel = [exps[i] for i in (indices or []) if isinstance(i, int) and 0 <= i < len(exps)]
        else:
            return jsonify({"error": "no records/preview provided"}), 400

        opts = body.get("options") or {}
        overrides = body.get("overrides") or []

        res = commit_many(
            sel,
            region_id=_safe_int(opts.get("region_id")) or 1,
            payment_type_id=_safe_int(opts.get("payment_type_id")),
            budget_item_id=_safe_int(opts.get("budget_item_id")),
            update_taxes_on_upsert=bool(opts.get("update_taxes_on_upsert", False)),
            allow_negative_adjustment=bool(opts.get("allow_negative_adjustment", False)),
            overrides=overrides,
        )
        # JSON-safe dönüş
        return jsonify(_json_safe(res)), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "commit_failed", "detail": str(e)}), 500

