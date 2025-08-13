# app/importer/expense/test.py
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

# sys.path ayarı: bu dosyayı direkt python ile koşturabilelim
HERE = Path(__file__).resolve().parent         # .../app/importer/expense
APP_ROOT = HERE.parent.parent                  # .../app
sys.path.insert(0, str(APP_ROOT))

from normalize_expense import build_preview
from plan_from_preview import plan_many, Defaults

def main():
    ap = argparse.ArgumentParser(description="Preview + Plan (no DB)")
    ap.add_argument("--file", default="expense.xlsx")
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--limit", type=int, default=2)
    ap.add_argument("--show-plan", action="store_true", help="Print planned Expense/Taxes/Payment")
    args = ap.parse_args()

    xlsx_path = (HERE / args.file)
    if not xlsx_path.exists():
        print(f"[!] File not found: {xlsx_path}")
        raise SystemExit(1)

    # 1) Preview: grup + kalem + vergi toplamları
    preview = build_preview(str(xlsx_path), sheet=(args.sheet if args.sheet is not None else 0))
    print("== PREVIEW SUMMARY ==")
    print(json.dumps({"count": preview["count"]}, indent=2, ensure_ascii=False))
    print(f"\n== FIRST {min(args.limit, preview['count'])} PREVIEW EXPENSES ==")
    print(json.dumps(preview["expenses"][: args.limit], indent=2, ensure_ascii=False))

    if not args.show_plan:
        return

    # 2) Plan: gerçek modele yazılacak alanlar (DB YOK)
    defaults = Defaults(region_id=1, payment_type_id=1, budget_item_id=1)
    plan = plan_many(preview["expenses"], defaults)
    # sadece ilk N planı yaz
    print(f"\n== FIRST {min(args.limit, len(plan['plans']))} PLANS ==")
    print(json.dumps({"plans": plan["plans"][: args.limit]}, indent=2, ensure_ascii=False))

    # resolver tablolarını da göster (isim -> fake id)
    print("\n== RESOLVED IDS (fake, in-memory) ==")
    print(json.dumps({
        "account_name_map": plan["account_name_map"],
        "supplier_map": plan["supplier_map"],
    }, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()

