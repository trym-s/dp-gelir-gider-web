
from app import create_app, db
from app.models import Region, PaymentType, AccountName, BudgetItem

app = create_app()
app.app_context().push()

def create_hierarchy():
    """İstenen hiyerarşiyi veritabanına ekler."""

    target_region_names = ["Teknopark", "DP Merkez", "Genel", "Dubai"]

    print("Hiyerarşi oluşturuluyor...")

    for region_name in target_region_names:
        # 1. Bölgeyi bul
        region = Region.query.filter_by(name=region_name).first()
        if not region:
            print(f"UYARI: '{region_name}' bölgesi bulunamadı, atlanıyor.")
            continue

        print(f"\n'{region_name}' bölgesi işleniyor...")

        # 2. Ödeme Türünü oluştur veya bul
        payment_type = PaymentType.query.filter_by(name="Genel", region_id=region.id).first()
        if not payment_type:
            payment_type = PaymentType(name="Genel", region=region)
            db.session.add(payment_type)
            db.session.flush() # ID'sinin oluşması için geçici olarak veritabanına gönder
            print(f"-> 'Genel' ödeme türü oluşturuldu.")
        else:
            print(f"-> 'Genel' ödeme türü zaten mevcut.")

        # 3. Hesap Adını oluştur veya bul
        account_name = AccountName.query.filter_by(name="SLA", payment_type_id=payment_type.id).first()
        if not account_name:
            account_name = AccountName(name="SLA", payment_type=payment_type)
            db.session.add(account_name)
            db.session.flush() # ID'sinin oluşması için
            print(f"--> 'SLA' hesap adı oluşturuldu.")
        else:
            print(f"--> 'SLA' hesap adı zaten mevcut.")

        # 4. Bütçe Kalemlerini (BI ve DBA) oluştur veya bul
        for budget_item_name in ["BI", "DBA"]:
            budget_item = BudgetItem.query.filter_by(name=budget_item_name, account_name_id=account_name.id).first()
            if not budget_item:
                budget_item = BudgetItem(name=budget_item_name, account_name=account_name)
                db.session.add(budget_item)
                print(f"---> '{budget_item_name}' bütçe kalemi oluşturuldu.")
            else:
                print(f"---> '{budget_item_name}' bütçe kalemi zaten mevcut.")

    # Tüm işlemleri veritabanına kalıcı olarak kaydet
    db.session.commit()
    print("\nHiyerarşi oluşturma işlemi başarıyla tamamlandı.")

if __name__ == "__main__":
    create_hierarchy()