#!/bin/bash

SCRIPT="run.py"
pip install openpyxl
pip install python-dateutil
pip install pymupdf
while true; do
    echo "[*] $SCRIPT çalıştırılıyor..."
    OUTPUT=$(python "$SCRIPT" 2>&1)

    if echo "$OUTPUT" | grep -q "ModuleNotFoundError"; then
        MODULE=$(echo "$OUTPUT" | grep "ModuleNotFoundError" | sed -E "s/.*No module named '(.*)'.*/\1/")
        echo "[+] Eksik modül bulundu: $MODULE"
        echo "[*] Kuruluyor: pip install $MODULE"
        pip install "$MODULE"
        echo ""
    else
        echo "[✔] Script çalıştı veya başka bir hata oluştu."
        echo "$OUTPUT"
        break
    fi
done
