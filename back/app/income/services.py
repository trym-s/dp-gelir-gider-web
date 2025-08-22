

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
from app.budget_item.models import BudgetItem
import re

class CustomerService:
    def get_by_id(self, customer_id: int) -> Customer:
        return Customer.query.get_or_404(customer_id)
    
    def get_all(self, filters: dict = None, sort_by: str = 'issue_date', sort_order: str = 'desc', page: int = 1, per_page: int = 20):
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
            
            id_fields = ['region_id', 'customer_id', 'account_name_id', 'budget_item_id']
            for key in id_fields:
                if value := filters.get(key):
                    if isinstance(value, str) and ',' in value:
                        id_list = [int(i) for i in value.split(',') if i.isdigit()]
                        if id_list:
                            query = query.filter(getattr(Income, key).in_(id_list))
                    elif str(value).isdigit():
                        query = query.filter(getattr(Income, key) == int(value))

            if statuses_str := filters.get('status'):
                statuses = [s.strip() for s in statuses_str.split(',')]
                if statuses:
                    query = query.filter(Income.status.in_(statuses))

        sort_column = getattr(Income, sort_by, Income.issue_date)
        order = desc(sort_column) if sort_order == 'desc' else asc(sort_column)
        return query.order_by(order).paginate(page=page, per_page=per_page, error_out=False)
    
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

        if 'name' in data and data['name'] != customer.name:
            if Customer.query.filter(Customer.id != customer_id, Customer.name == data['name']).first():
                raise AppError(f"'{data['name']}' isimli başka bir müşteri zaten var.", 409)
            customer.name = data['name']

        if 'tax_number' in data and data.get('tax_number') != customer.tax_number:
            tax_number = data.get('tax_number')
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
        return query.order_by(order).paginate(page=page, per_page=per_page, error_out=False)
    
    def get_all_filtered(self, filters: dict = None, sort_by: str = 'issue_date', sort_order: str = 'desc'):
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
        
        return query.order_by(order).all()

    def create(self, income_object: Income) -> Income:
        if Income.query.filter_by(invoice_number=income_object.invoice_number).first():
            raise AppError(f"Fatura Numarası '{income_object.invoice_number}' zaten mevcut.", 409)
        income_object.status = IncomeStatus.UNRECEIVED
        return income_object
    
    
    def _get_base_description(self, description: str) -> str:
        # Bu fonksiyon artık get_yearly_report_pivot_data içinde kullanılmıyor
        # ancak başka bir yerde kullanılabileceği için silinmedi.
        months = [
            "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
            "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
        ]
        months_pattern = r'\b(' + '|'.join(months) + r')\b'
        
        base_desc = re.sub(months_pattern, '', description, flags=re.IGNORECASE)
        base_desc = re.sub(r'\b\d{4}\b', '', base_desc)
        base_desc = re.sub(r'\d{1,2}\s?/\s?\d{1,2}', '', base_desc)
        base_desc = re.sub(r'\s+', ' ', base_desc).strip()
        
        return base_desc
    
    def _find_common_prefix(self, descs: list) -> str:
        if not descs:
            return ""
        shortest = min(descs, key=len)
        for i, char in enumerate(shortest):
            for other in descs:
                if other[i] != char:
                    return shortest[:i].strip().rstrip(' -_')
        return shortest.strip()

    def get_yearly_report_pivot_data(self, year: int):
        """Yıllık Gelir Raporu için para birimine göre gruplanmış veri döndürür."""
        try:
            query_result = db.session.query(
                Income.total_amount,
                Income.currency,
                extract('month', Income.issue_date).label('month'),
                BudgetItem.name.label('budget_item_name'),
                Customer.name.label('company_name'),
                Income.invoice_name.label('description')
            ).join(Income.customer)\
             .join(Income.budget_item)\
             .filter(extract('year', Income.issue_date) == year)\
             .filter(func.trim(Customer.name) != '')\
             .filter(func.trim(BudgetItem.name) != '')\
             .all()

            processed_data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
            for income in query_result:
                key = (income.budget_item_name, income.company_name)
                processed_data[key][income.month][income.currency.name].append({
                    'amount': income.total_amount,
                    'desc': income.description
                })

            final_structure = defaultdict(lambda: {'children': [], 'monthly_totals': defaultdict(lambda: defaultdict(Decimal))})
            for key, monthly_values in processed_data.items():
                budget_item, company = key
                
                all_descriptions = [d['desc'] for month_list in monthly_values.values() for currency_list in month_list.values() for d in currency_list]
                unique_descriptions = sorted(list(set(all_descriptions)))
                display_description = self._find_common_prefix(unique_descriptions) or budget_item

                child_data = {
                    'firma': company,
                    'description': display_description,
                    'toplam': defaultdict(Decimal)
                }
                
                for month, currency_values in monthly_values.items():
                    month_totals_by_currency = defaultdict(Decimal)
                    all_details = []
                    for currency_name, details_list in currency_values.items():
                        total_for_currency = sum(d['amount'] for d in details_list)
                        month_totals_by_currency[currency_name] += total_for_currency
                        child_data['toplam'][currency_name] += total_for_currency
                        final_structure[budget_item]['monthly_totals'][month][currency_name] += total_for_currency
                        all_details.extend([d['desc'] for d in details_list])
                    
                    child_data[str(month)] = {
                        'total': {k: float(v) for k, v in month_totals_by_currency.items()},
                        'details': all_details
                    }
                
                child_data['toplam'] = {k: float(v) for k, v in child_data['toplam'].items()}
                final_structure[budget_item]['children'].append(child_data)
            
            result_list = []
            for budget_item, data in final_structure.items():
                group_totals_by_currency = defaultdict(Decimal)
                for month_totals in data['monthly_totals'].values():
                    for currency, total in month_totals.items():
                        group_totals_by_currency[currency] += total

                group_data = {
                    'budget_item_name': budget_item,
                    'children': sorted(data['children'], key=lambda x: x['firma']),
                    'toplam': {k: float(v) for k, v in group_totals_by_currency.items()}
                }
                
                for month, month_totals in data['monthly_totals'].items():
                    group_data[str(month)] = {k: float(v) for k, v in month_totals.items()}
                
                result_list.append(group_data)

            return sorted(result_list, key=lambda x: x['budget_item_name'])

        except Exception as e:
            print(f"Error in get_yearly_report_pivot_data: {e}")
            raise AppError("Yıllık rapor verisi oluşturulurken bir hata oluştu.", 500) from e
    

    def get_report_pivot_data(self, year: int, month: int):
        """
        Aylık Tahsilat Raporu için gerekli tüm verileri hesaplar ve formatlar. (DAHA SAĞLAM VERSİYON)
        """
        try:
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

        total_received = db.session.query(
            func.sum(IncomeReceipt.receipt_amount)
        ).filter(
            IncomeReceipt.income_id == income.id,
            IncomeReceipt.currency == income.currency
        ).scalar() or Decimal('0.00')
        
        income.received_amount = total_received
        print(f"1. Toplam Tahsilat (Sadece Ana Para Biriminde): {total_received}, Fatura Tutarı: {income.total_amount}")

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