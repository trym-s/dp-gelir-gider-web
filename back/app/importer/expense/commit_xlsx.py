from __future__ import annotations
import argparse, json, os
from pathlib import Path

from app import create_app
from app.importer.expense.normalize_expense import build_preview
from app.importer.expense.commit_from_review import commit_many

HERE = Path(__file__).resolve().parent

def main():
    ap = argparse.ArgumentParser(description="XLSX -> preview -> DB upsert")
    ap.add_argument("--file", default="expense.xlsx")
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--region", type=int, default=1)
    ap.add_argument("--ptype", type=int, default=1)
    ap.add_argument("--budget", type=int, default=1)
    ap.add_argument("--update-taxes", action="store_true")
    ap.add_argument("--allow-negative", action="store_true")
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    xlsx = HERE / args.file
    if not xlsx.exists():
        print(f"[!] File not found: {xlsx}")
        raise SystemExit(1)

    preview = build_preview(str(xlsx), sheet=(args.sheet if args.sheet is not None else 0))
    print("== PREVIEW SUMMARY ==")
    print(json.dumps({"count": preview["count"]}, indent=2, ensure_ascii=False))

    if args.dry:
        print(json.dumps({"first": preview["expenses"][:2]}, indent=2, ensure_ascii=False))
        return

    app = create_app(os.getenv("FLASK_CONFIG", "development"))
    with app.app_context():
        res = commit_many(
            preview["expenses"],
            region_id=args.region,
            payment_type_id=args.ptype,
            budget_item_id=args.budget,
            update_taxes_on_upsert=args.update_taxes,
            allow_negative_adjustment=args.allow_negative,
        )
        print("== COMMIT RESULT ==")
        print(json.dumps(res, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
