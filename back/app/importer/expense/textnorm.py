# app/importer/expense/textnorm.py
from __future__ import annotations
import re, unicodedata
from typing import Optional

_space_re = re.compile(r"\s+")

def norm_text(s: Optional[str]) -> str:
    """
    Bir insan adını/kurum adını güvenli karşılaştırma için normalize eder:
    - strip, çoklu boşlukları tek boşluk
    - NFKD + diacritics (Mn) kaldırma  → Türkçe 'İ' nokta problemi çözülür
    - casefold
    """
    x = (s or "").strip()
    if not x:
        return ""
    x = unicodedata.normalize("NFKD", x)
    x = "".join(ch for ch in x if unicodedata.category(ch) != "Mn")
    x = _space_re.sub(" ", x)
    return x.casefold()
