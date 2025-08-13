
# column_policy.py
from __future__ import annotations
from typing import List, Tuple, Dict
import re

# Açık DROP listesi (dosyada görülen başlık isimleri)
DROP_HEADERS = {
    "Belge Türü",
    "Döviz tipi",
    "Döviz Kuru",
    "Vade tarihi",
    "Genel Toplam",
    "Toplam ödenen",
    "Son ödemenin yapıldığı hesap",
    "Cebinden Ödeyen Çalışan",
    "Harcayan",
    "Ürün/hizmet kodu",
    "Ürün/Hizmet açıklaması",
    # İstersen "Ürün/hizmet Net Tutarı (TL)"yi de düşür
}

# Senin final mapping’in (Expense + Line alanları)
RENAME_MAP: Dict[str, str] = {
    "Düzenleme tarihi": "date",
    "Tedarikçi / Çalışan": "supplier",
    "Fatura ismi": "invoice_name",
    "Kategori": "account_name",        # <- sen böyle istedin; BudgetItem yerine AccountName’e bağlanacak
    "Genel Toplam (TL)": "amount",
    "Toplam ödenen (TL)": "total_paid",
    "Fiş/Fatura No": "invoice_number",
    "Son ödemenin yapıldığı tarih": "last_payment_date",
    "Ürün/hizmet": "description",
    "Miktar": "quantity",
    "Birim fiyatı": "unit_price",
    "İndirim": "discount",
    "KDV Tutarı": "kdv_amount",
    "Tevkifat Tutarı": "tevkifat_amount",
    "ÖTV": "otv_amount",
    "ÖİV": "oiv_amount",
    "Ürün/hizmet Net Tutarı": "net_amount",
}

# Normalization (boşluk/case/ayraç varyasyonlarına tolerans)
_space_re = re.compile(r"\s+")
def _canon(s: str) -> str:
    s = (s or "").strip()
    s = _space_re.sub(" ", s)
    s = s.replace(" / ", "/").replace(" /", "/").replace("/ ", "/")
    return s.casefold()

_DROP_KEYS = {_canon(h) for h in DROP_HEADERS}
_RENAME_KEYS = {_canon(k): v for k, v in RENAME_MAP.items()}

def build_projection(headers: List[str]) -> Tuple[List[int], List[str]]:
    """
    Headers:
      - DROP_HEADERS’ta olanları at,
      - RENAME_MAP ile isimlendir,
      - Diğerlerini aynen bırak,
      - Çakışmaları _2, _3 ile çöz.
    """
    take_idx: List[int] = []
    new_names: List[str] = []
    seen: Dict[str, int] = {}

    for i, h in enumerate(headers):
        key = _canon(h)
        if key in _DROP_KEYS:
            continue
        base = _RENAME_KEYS.get(key, h.strip())
        if not base:
            continue
        # uniq isim
        if base in seen:
            seen[base] += 1
            name = f"{base}_{seen[base]}"
        else:
            seen[base] = 0
            name = base
        take_idx.append(i)
        new_names.append(name)

    return take_idx, new_names

