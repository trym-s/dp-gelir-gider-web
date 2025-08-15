
# dto.py
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from decimal import Decimal
from typing import List, Optional, Dict, Any

@dataclass
class ExpenseLineDTO:
    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    kdv_rate: Optional[Decimal] = None
    kdv_amount: Optional[Decimal] = None
    tevkifat_rate: Optional[Decimal] = None
    tevkifat_amount: Optional[Decimal] = None
    otv_amount: Optional[Decimal] = None
    oiv_amount: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in d.items()}

@dataclass
class TaxTotalsDTO:
    kdv: Decimal = Decimal("0")
    tevkifat: Decimal = Decimal("0")
    otv: Decimal = Decimal("0")
    oiv: Decimal = Decimal("0")

    def to_dict(self) -> dict:
        return { "KDV": str(self.kdv), "TEVKIFAT": str(self.tevkifat), "OTV": str(self.otv), "OIV": str(self.oiv) }

@dataclass
class ExpenseDTO:
    invoice_number: Optional[str] = None
    invoice_name: Optional[str] = None
    date: Optional[str] = None
    supplier: Optional[str] = None
    account_name: Optional[str] = None  # per your mapping
    amount: Optional[Decimal] = None
    total_paid: Optional[Decimal] = None
    last_payment_date: Optional[str] = None

    lines: List[ExpenseLineDTO] = field(default_factory=list)
    taxes: TaxTotalsDTO = field(default_factory=TaxTotalsDTO)

    def to_dict(self) -> dict:
        return {
            "invoice_number": self.invoice_number,
            "invoice_name": self.invoice_name,
            "date": self.date,
            "supplier": self.supplier,
            "account_name": self.account_name,
            "amount": str(self.amount) if self.amount is not None else None,
            "total_paid": str(self.total_paid) if self.total_paid is not None else None,
            "last_payment_date": self.last_payment_date,
            "taxes": self.taxes.to_dict(),
            "lines": [ln.to_dict() for ln in self.lines],
        }
