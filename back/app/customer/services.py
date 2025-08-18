# back/app/customer/services.py

from app.customer.models import Customer
from app.base_service import BaseService
from app import db
from app.errors import AppError

class CustomCustomerService(BaseService):
    def create(self, data: dict):
        """
        BaseService'in create metodunu, müşteri oluşturma kaynağına göre
        farklı mantık işletecek şekilde genişletir.
        """
        source = data.pop('source', None)
        is_from_income_form = (source == 'income_form')

        if self.model.query.filter_by(name=data['name']).first():
            raise AppError(f"'{data['name']}' isimli müşteri zaten mevcut.", 409)

        # Ana Mantık: Kaynağa göre vergi numarası işlemleri
        if is_from_income_form:
            # Gelir Formu'ndan geliyorsa, otomatik vergi numarası oluştur
            if 'tax_number' in data and data.get('tax_number'):
                 # Eğer yine de vergi numarası gönderilmişse (örn: test), yine de kontrol et
                if self.model.query.filter_by(tax_number=data['tax_number']).first():
                    raise AppError(f"'{data['tax_number']}' vergi numarası zaten kullanılıyor.", 409)
            else:
                # Otomatik numara oluşturma mantığı
                last_dpt_customer = self.model.query.filter(
                    self.model.tax_number.like('DPT-%')
                ).order_by(
                    db.func.cast(db.func.substring(self.model.tax_number, 5), db.Integer).desc()
                ).first()

                next_number = 1
                if last_dpt_customer and last_dpt_customer.tax_number:
                    try:
                        last_number_str = last_dpt_customer.tax_number.split('-')[1]
                        next_number = int(last_number_str) + 1
                    except (IndexError, ValueError):
                        pass # Hata olursa 1'den devam et
                
                data['tax_number'] = f"DPT-{next_number:05d}"
        else:
            # Standart ekleme senaryosu: Vergi numarası zorunlu
            if not data.get('tax_number'):
                raise AppError("Vergi numarası zorunlu bir alandır.", 400)
            if self.model.query.filter_by(tax_number=data['tax_number']).first():
                raise AppError(f"'{data['tax_number']}' vergi numarası zaten başka bir müşteriye atanmış.", 409)
        
        # Verinin son haliyle standart BaseService.create metodunu çağır
        return super().create(data)

# CustomerService'i bizim özel sınıfımızdan türetiyoruz
CustomerService = CustomCustomerService(Customer)