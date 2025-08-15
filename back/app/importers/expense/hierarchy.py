# app/importer/expense/hierarchy.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple
from sqlalchemy import select
from app import db

# Model import yollarını projenle eşle
from app.region.models import Region
from app.payment_type.models import PaymentType
from app.account_name.models import AccountName
from app.budget_item.models import BudgetItem

def load_catalog(region_id: int) -> Dict[str, Any]:
    """Verilen region altında payment_type, account_name ve budget_item hiyerarşisini getirir."""
    # Payment types
    pts = db.session.execute(
        select(PaymentType.id, PaymentType.name).where(PaymentType.region_id == region_id)
    ).all()
    pt_list = [{"id": pid, "name": name} for pid, name in pts]
    pt_ids = [pid for pid, _ in pts]

    # Accounts by payment type
    acc_rows = db.session.execute(
        select(AccountName.id, AccountName.name, AccountName.payment_type_id)
        .where(AccountName.payment_type_id.in_(pt_ids))
    ).all()
    acc_by_pt: Dict[int, List[Dict[str, Any]]] = {}
    for aid, name, ptid in acc_rows:
        acc_by_pt.setdefault(ptid, []).append({"id": aid, "name": name})

    # Budget items by account
    acc_ids = [r[0] for r in acc_rows] or [-1]
    bud_rows = db.session.execute(
        select(BudgetItem.id, BudgetItem.name, BudgetItem.account_name_id)
        .where(BudgetItem.account_name_id.in_(acc_ids))
    ).all()
    bud_by_acc: Dict[int, List[Dict[str, Any]]] = {}
    for bid, name, accid in bud_rows:
        bud_by_acc.setdefault(accid, []).append({"id": bid, "name": name})

    return {
        "region_id": region_id,
        "payment_types": pt_list,
        "accounts_by_payment_type": acc_by_pt,     # { pt_id: [{id,name}] }
        "budget_items_by_account": bud_by_acc,     # { acc_id: [{id,name}] }
    }
