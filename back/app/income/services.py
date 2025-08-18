from decimal import Decimal
from sqlalchemy import desc, asc, func, extract
from sqlalchemy.orm import joinedload
from .. import db
from app.customer.models import Customer


from app.income.models import Income, IncomeStatus, IncomeReceipt, PaymentTimelinessStatus,Currency
from app.errors import AppError
from decimal import Decimal

from collections import defaultdict
from datetime import datetime, date , timedelta 



class CustomerService:
    def get_by_id(self, customer_id: int) -> Customer:
        return Customer.query.get_or_404(customer_id)
    def get_all(self):
        return Customer.query.order_by(Customer.name).all()
    def create(self, data: dict) -> Customer:
        if Customer.query.filter_by(name=data['name']).first():
            raise AppError(f"Customer with name '{data['name']}' already exists.", 409)
        
        tax_number = data.get('tax_number')
        if tax_number and Customer.query.filter_by(tax_number=tax_number).first():
            raise AppError(f"'{tax_number}' vergi numarası zaten başka bir müşteriye atanmış.", 409)

        new_customer = Customer(
            name=data['name'],
            tax_number=tax_number
        )
        db.session.add(new_customer)
        db.session.commit()
        return new_customer
    
    def update(self, customer_id: int, data: dict) -> Customer:
        customer = self.get_by_id(customer_id)

        # İsim güncelleme ve kontrol
        if 'name' in data and data['name'] != customer.name:
            if Customer.query.filter(Customer.id != customer_id, Customer.name == data['name']).first():
                raise AppError(f"'{data['name']}' isimli başka bir müşteri zaten var.", 409)
            customer.name = data['name']

        # Vergi numarası güncelleme ve kontrol
        if 'tax_number' in data and data.get('tax_number') != customer.tax_number:
            tax_number = data.get('tax_number')
            # Vergi no hem dolu gelmeli hem de başka bir kullanıcıya ait olmamalı
            if tax_number and Customer.query.filter(Customer.id != customer_id, Customer.tax_number == tax_number).first():
                raise AppError(f"'{tax_number}' vergi numarası zaten başka bir müşteriye atanmış.", 409)
            customer.tax_number = tax_number

        db.session.commit()
        return customer


class IncomeService:
    def get_by_id(self, income_id: int) -> Income:
        return Income.query.get_or_404(income_id)

    def get_all(self, filters: dict = None, sort_by: str = 'issue_date', sort_order: str = 'desc', page: int = 1, per_page: int = 20):
        query = Income.query.options(
            joinedload(Income.customer), joinedload(Income.region),
            joinedload(Income.account_name), joinedload(Income.budget_item)
        )
        
        if filters:
            # Metin bazlı arama (fatura ismi veya numarası)
            if term := filters.get('search_term'):
                search_clause = f"%{term.lower()}%"
                query = query.filter(
                    func.lower(Income.invoice_name).like(search_clause) |
                    func.lower(Income.invoice_number).like(search_clause)
                )

            # Tarih aralığı
            if start := filters.get('date_start'):
                query = query.filter(Income.issue_date >= start)
            if end := filters.get('date_end'):
                query = query.filter(Income.issue_date <= end)
            
            # Kategori ID'lerine göre filtreleme
            for key in ['region_id', 'customer_id', 'account_name_id', 'budget_item_id']:
                if value := filters.get(key):
                    query = query.filter(getattr(Income, key) == value)
            
            # Duruma göre filtreleme (birden fazla durum seçilebilir)
            if statuses_str := filters.get('status'):
                statuses = [s.strip() for s in statuses_str.split(',')]
                if statuses:
                    query = query.filter(Income.status.in_(statuses))

        sort_column = getattr(Income, sort_by, Income.issue_date)
        order = desc(sort_column) if sort_order == 'desc' else asc(sort_column)
        return query.order_by(order).paginate(page=page, per_page=per_page, error_out=False)
    
    def get_all_filtered(self, filters: dict = None, sort_by: str = 'issue_date', sort_order: str = 'desc'):
        # Bu fonksiyon get_all ile birebir aynı, tek farkı sayfalama yapmaması.
        query = Income.query.options(
            joinedload(Income.customer), joinedload(Income.region),
            joinedload(Income.account_name), joinedload(Income.budget_item)
        )
        
        if filters:
            if term := filters.get('search_term'):
                search_clause = f"%{term.lower()}%"
                query = query.filter(
                    func.lower(Income.invoice_name).like(search_clause) |
                    func.lower(Income.invoice_number).like(search_clause)
                )
            if start := filters.get('date_start'):
                query = query.filter(Income.issue_date >= start)
            if end := filters.get('date_end'):
                query = query.filter(Income.issue_date <= end)
            
            for key in ['region_id', 'customer_id', 'account_name_id', 'budget_item_id']:
                if value := filters.get(key):
                    query = query.filter(getattr(Income, key) == value)
            
            if statuses_str := filters.get('status'):
                statuses = [s.strip() for s in statuses_str.split(',')]
                if statuses:
                    query = query.filter(Income.status.in_(statuses))

        sort_column = getattr(Income, sort_by, Income.issue_date)
        order = desc(sort_column) if sort_order == 'desc' else asc(sort_column)
        
        # .paginate() olmadan tüm sonuçları döndürür
        return query.order_by(order).all()

    def create(self, income_object: Income) -> Income:
        if Income.query.filter_by(invoice_number=income_object.invoice_number).first():
            raise AppError(f"Fatura Numarası '{income_object.invoice_number}' zaten mevcut.", 409)
        income_object.status = IncomeStatus.UNRECEIVED
        return income_object
    

    def get_report_pivot_data(self, year: int, month: int):

        """
        Aylık Tahsilat Raporu için gerekli tüm verileri hesaplar ve formatlar. (DAHA SAĞLAM VERSİYON)
        """
        try:
            # Daha sağlam tarih hesaplama: Ayın başlangıcı ve bir sonraki ayın başlangıcı
            start_date = date(year, month, 1)
            if month == 12:
                next_month_start_date = date(year + 1, 1, 1)
            else:
                next_month_start_date = date(year, month + 1, 1)
        except ValueError:
            raise AppError("Geçersiz yıl veya ay.", 400)
        
        print(f"--- Rapor oluşturuluyor: {year}-{month} ---")
        print(f"Hesaplanan tarih filtresi: >= {start_date} VE < {next_month_start_date}")

        def _format_currency_data(query_result):
            return {currency.name: float(amount or 0) for currency, amount in query_result}

        # --- Metrik (KPI) Sorguları (Filtreler güncellendi) ---

        total_invoiced_query = db.session.query(
            Income.currency, func.sum(Income.total_amount)
        ).filter(
            Income.issue_date >= start_date,
            Income.issue_date < next_month_start_date
        ).group_by(Income.currency).all()
        total_invoiced = _format_currency_data(total_invoiced_query)

        total_received_query = db.session.query(
            IncomeReceipt.currency, func.sum(IncomeReceipt.receipt_amount)
        ).filter(
            IncomeReceipt.receipt_date >= start_date,
            IncomeReceipt.receipt_date < next_month_start_date
        ).group_by(IncomeReceipt.currency).all()
        total_received = _format_currency_data(total_received_query)

        remaining_query = db.session.query(
            Income.currency, func.sum(Income.remaining_amount)
        ).filter(
            Income.status != IncomeStatus.RECEIVED
        ).group_by(Income.currency).all()
        remaining = _format_currency_data(remaining_query)
        
        customer_count = db.session.query(
            func.count(func.distinct(Income.customer_id))
        ).select_from(IncomeReceipt).join(
            Income, IncomeReceipt.income_id == Income.id
        ).filter(
            IncomeReceipt.receipt_date >= start_date,
            IncomeReceipt.receipt_date < next_month_start_date
        ).scalar() or 0
        print(f"DEBUG: Ay içinde tahsilat yapılan müşteri sayısı: {customer_count}")

        # --- Pivot Tablo Sorgusu (Filtre güncellendi) ---
        pivot_query_result = db.session.query(
            Customer.name,
            extract('day', IncomeReceipt.receipt_date).label('day'),
            IncomeReceipt.currency,
            func.sum(IncomeReceipt.receipt_amount).label('daily_sum')
        ).join(
            Income, IncomeReceipt.income_id == Income.id
        ).join(
            Customer, Income.customer_id == Customer.id
        ).filter(
            IncomeReceipt.receipt_date >= start_date,
            IncomeReceipt.receipt_date < next_month_start_date
        ).group_by(
            Customer.name, extract('day', IncomeReceipt.receipt_date), IncomeReceipt.currency
        ).order_by(
            Customer.name
        ).all()
        print(f"DEBUG: Pivot tablo için veritabanından {len(pivot_query_result)} satır çekildi.")

        # ... (Veri dönüştürme mantığı aynı kalacak) ...
        pivot_data_transformed = defaultdict(lambda: {
            'customer_name': '', 'daily_totals': defaultdict(lambda: defaultdict(float)), 'monthly_total': defaultdict(float)
        })
        for customer_name, day, currency, daily_sum in pivot_query_result:
            entry = pivot_data_transformed[customer_name]
            entry['customer_name'] = customer_name
            amount = float(daily_sum or 0)
            currency_name = currency.name
            entry['daily_totals'][str(day)][currency_name] += amount
            entry['monthly_total'][currency_name] += amount
        
        return {
            "kpis": { "total_invoiced": total_invoiced, "total_received": total_received, "remaining": remaining, "customer_count": customer_count },
            "pivot_data": list(pivot_data_transformed.values())
        }
    
    

class IncomeReceiptService:
    @staticmethod
    def _recalculate_income_state(income: Income):
        print("\n--- Durum yeniden hesaplanıyor ---")

        # --- ANA DEĞİŞİKLİK BURADA ---
        # Mevcut mantığı koruyarak, "total_received" hesaplamasına
        # sadece faturanın kendi para birimiyle eşleşen tahsilatları dahil ediyoruz.
        total_received = db.session.query(
            func.sum(IncomeReceipt.receipt_amount)
        ).filter(
            IncomeReceipt.income_id == income.id,
            IncomeReceipt.currency == income.currency  # SADECE BU SATIR EKLENDİ
        ).scalar() or Decimal('0.00')
        # --- DEĞİŞİKLİK SONU ---
        
        income.received_amount = total_received
        print(f"1. Toplam Tahsilat (Sadece Ana Para Biriminde): {total_received}, Fatura Tutarı: {income.total_amount}")

        # Buradan sonraki mantık, yukarıda hesaplanan `total_received` değerine
        # göre çalıştığı için olduğu gibi kalır.
        
        latest_receipt = IncomeReceipt.query.filter_by(income_id=income.id).order_by(db.desc(IncomeReceipt.receipt_date)).first()
        income.last_receipt_date = latest_receipt.receipt_date if latest_receipt else None
        print(f"2. Son Tahsilat Tarihi: {income.last_receipt_date}, Vade Tarihi: {income.due_date}")

        if total_received >= income.total_amount:
            print("3. KOŞUL: Fatura TAMAMEN ÖDENDİ olarak tespit edildi.")
            income.status = IncomeStatus.RECEIVED
            
            if income.due_date and latest_receipt:
                if latest_receipt.receipt_date > income.due_date:
                    print("4. Vade durumu: GEÇ ÖDENDİ")
                    income.timeliness_status = PaymentTimelinessStatus.LATE
                elif latest_receipt.receipt_date < income.due_date:
                    print("4. Vade durumu: ERKEN ÖDENDİ")
                    income.timeliness_status = PaymentTimelinessStatus.EARLY
                else:
                    print("4. Vade durumu: VAKTİNDE ÖDENDİ")
                    income.timeliness_status = PaymentTimelinessStatus.ON_TIME
            else:
                income.timeliness_status = None
                print("4. Vade durumu: Vade tarihi olmadığı için hesaplanmadı.")

        elif total_received > 0:
            print("3. KOŞUL: Fatura KISMİ ÖDENDİ olarak tespit edildi.")
            income.status = IncomeStatus.PARTIALLY_RECEIVED
            income.timeliness_status = None
        else:
            print("3. KOŞUL: Fatura ÖDENMEDİ olarak tespit edildi.")
            income.status = IncomeStatus.UNRECEIVED
            income.timeliness_status = None
        
        print(f"5. SONUÇ -> Status: {income.status}, Timeliness: {income.timeliness_status}\n")

    def create(self, income_id: int, receipt_object: IncomeReceipt) -> Income:
        # Bu metodun mantığı değişmiyor. Gelen tahsilat objesini veritabanına ekler
        # ve ardından durumu yeniden hesaplatır.
        try:
            income = Income.query.with_for_update().get(income_id)
            if not income:
                raise AppError(f"Gelir ID {income_id} bulunamadı.", 404)
            
            receipt_object.income_id = income.id
            db.session.add(receipt_object)
            db.session.flush()
            self._recalculate_income_state(income)
            db.session.commit()
            return income 
        except Exception as e:
            db.session.rollback()
            raise AppError(f"Tahsilat oluşturulurken hata: {e}", 500) from e