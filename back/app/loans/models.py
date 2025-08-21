import enum
from app import db
from datetime import datetime
import pytz

class LoanStatus(enum.Enum):
    PENDING_APPROVAL = "Onay Bekliyor"
    ACTIVE = "Aktif"
    PAID_IN_FULL = "Tamamen Ödendi"
    OVERDUE = "Vadesi Geçmiş" # Ödemesi gecikmiş
    DEFAULTED = "Takibe Düştü" # Uzun süre ödenmemiş

class LoanType(db.Model):
    __tablename__ = 'loan_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

    def __repr__(self):
        return f'<LoanType {self.name}>'

class Loan(db.Model):
    """
    Şirketin aldığı kredileri ve bu kredilerin tüm detaylarını, 
    yaşam döngüsünü ve ödeme takvimini yöneten model.
    """
    __tablename__ = 'loans'

    # === TEMEL TANIMLAYICI BİLGİLER ===
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, comment="Krediyi ayırt etmek için kullanılan isim (örn: 'Nisan 2025 Taşıt Kredisi')")
    
    # === İLİŞKİLER ===
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_account.id'), nullable=False, comment="Kredinin yattığı banka hesabı")
    loan_type_id = db.Column(db.Integer, db.ForeignKey('loan_types.id'), nullable=False, comment="Kredinin türü (örn: Taksitli, Rotatif)")

    # === FİNANSAL KOŞULLAR (ANLAŞMA ŞARTLARI) ===
    amount_drawn = db.Column(db.Numeric(10, 2), nullable=False, comment="Çekilen toplam anapara tutarı")
    term_months = db.Column(db.Integer, nullable=False, comment="Kredinin vadesi (ay olarak)")
    monthly_interest_rate = db.Column(db.Float, nullable=False, comment="Bankanın verdiği vergisiz, net aylık faiz oranı (örn: 0.05)")
    bsmv_rate = db.Column(db.Float, nullable=False, default=0.15, comment="Faiz üzerinden alınan BSMV oranı (varsayılan: 0.15)")
    payment_due_day = db.Column(db.Integer, nullable=False, comment="Ödemenin her ayın kural olarak hangi gününde beklendiğini gösteren tamsayı (örn: 15). Bir sonraki ödeme tarihi, bu 'kural' günü baz alınarak hesaplanır.")
    monthly_payment_amount = db.Column(db.Numeric(10, 2), nullable=True, comment="Hesaplama sonucu bulunan, her ay ödenecek sabit taksit tutarı")

    # === CANLI TAKİP BİLGİLERİ (DİNAMİK DURUM) ===
    remaining_principal = db.Column(db.Numeric(10, 2), nullable=False, comment="Kalan mevcut anapara borcu. Her ödemede güncellenir.")
    status = db.Column(db.Enum(LoanStatus), nullable=False, default=LoanStatus.ACTIVE, comment="Kredinin mevcut durumu (Aktif, Ödendi vb.)")
    
    # === TARİH ALANLARI VE ANLAMLARI ===
    date_drawn = db.Column(db.Date, nullable=False, comment="Kredinin çekildiği, yani paranın hesaba geçtiği ve borcun resmen başladığı tarih.")
    next_payment_due_date = db.Column(db.Date, nullable=True, comment="Bir sonraki taksit ödemesinin beklendiği *net* tarih. Bu alan, vadesi geçen kredileri bulmak gibi operasyonel sorgularda kullanılır ve performansı artırır.")
    
    # === AÇIKLAYICI VE DENETİM (AUDIT) ALANLARI ===
    description = db.Column(db.Text, nullable=True, comment="Krediyle ilgili ek notlar")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Istanbul')), comment="Bu kaydın veritabanında ilk oluşturulduğu zaman damgası.")
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Istanbul')), onupdate=lambda: datetime.now(pytz.timezone('Europe/Istanbul')), comment="Bu kaydın en son güncellendiği zaman damgası.")

    # === SQLAlchemy İLİŞKİLERİ ===
    payments = db.relationship('LoanPayment', back_populates='loan', lazy='dynamic', cascade="all, delete-orphan")
    amortization_schedule = db.relationship('AmortizationSchedule', back_populates='loan', lazy='dynamic', cascade="all, delete-orphan")
    bank_account = db.relationship('BankAccount', backref=db.backref('loans', lazy=True))
    loan_type = db.relationship('LoanType', backref=db.backref('loans', lazy=True))

    def __repr__(self):
        return f'<Loan {self.name} - {self.status.value}>'


class AmortizationSchedule(db.Model):
    """
    Bir kredinin tüm taksitlerini, finansal dökümlerini ve vade tarihlerini
    kalıcı olarak saklayan tablo. Kredi oluşturulduğunda bir defa yaratılır.
    """
    __tablename__ = 'amortization_schedule'
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id', ondelete='CASCADE'), nullable=False, index=True)
    installment_number = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    monthly_payment = db.Column(db.Numeric(10, 2), nullable=False)
    principal_share = db.Column(db.Numeric(10, 2), nullable=False)
    interest_share = db.Column(db.Numeric(10, 2), nullable=False)
    remaining_principal = db.Column(db.Numeric(10, 2), nullable=False)

    loan = db.relationship('Loan', back_populates='amortization_schedule')
    # Bir taksitin sadece bir ödemesi olabilir (veya hiç olmayabilir)
    payment = db.relationship('LoanPayment', back_populates='amortization_schedule', uselist=False)

    def __repr__(self):
        return f'<AmortizationSchedule loan_id={self.loan_id} - #${self.installment_number}>'

# --- Ödeme Türlerini Tanımlayan Enum ---
class LoanPaymentType(enum.Enum):
    """Ödemenin amacını ve türünü belirtir."""
    REGULAR_INSTALLMENT = "Normal Taksit"
    PREPAYMENT = "Ara Ödeme" # Anaparayı azaltmak için yapılan ek ödeme
    SETTLEMENT = "Erken Kapama Ödemesi" # Krediyi tamamen kapatan ödeme
    OTHER = "Diğer"

# --- Ödeme Durumlarını Tanımlayan Enum ---
class LoanPaymentStatus(enum.Enum):
    """Ödemenin muhasebesel durumunu belirtir."""
    COMPLETED = "Tamamlandı"
    PENDING_CLEARANCE = "Onay Bekliyor" # Çek gibi araçlar için
    REVERSED = "İptal Edildi" # Bankadan dönen bir ödeme vb.

# --- Önerilen LoanPayment Modeli ---
class LoanPayment(db.Model):
    """
    Bir krediye yapılan her bir ödemeyi, finansal dökümüyle birlikte
    kayıt altına alan, değişmez bir işlem kaydı modelidir.
    """
    __tablename__ = 'loan_payments'

    # === TEMEL TANIMLAYICI BİLGİLER ===
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False, comment="Bu ödemenin ait olduğu kredi")
    # === YENİ İLİŞKİ ===
    amortization_schedule_id = db.Column(db.Integer, db.ForeignKey('amortization_schedule.id'), nullable=True, comment="Eğer bu bir taksit ödemesiyse, ilgili taksitin ID'si")

    # === FİNANSAL DÖKÜM ===
    # Bu alanlar LoanService tarafından hesaplanarak doldurulur.
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False, comment="Müşteriden alınan toplam ödeme tutarı")
    principal_amount = db.Column(db.Numeric(10, 2), nullable=False, comment="Ödenen toplam tutarın anapara borcunu azaltan kısmı")
    interest_amount = db.Column(db.Numeric(10, 2), nullable=False, comment="Ödenen toplam tutarın faiz borcunu karşılayan kısmı (BSMV dahil)")

    # === BAĞLAMSAL BİLGİLER VE DURUM ===
    payment_date = db.Column(db.Date, nullable=False, comment="Ödemenin yapıldığı fiili tarih")
    payment_type = db.Column(db.Enum(LoanPaymentType), nullable=False, default=LoanPaymentType.REGULAR_INSTALLMENT, comment="Ödemenin türü (örn: Normal taksit, ara ödeme)")
    status = db.Column(db.Enum(LoanPaymentStatus), nullable=False, default=LoanPaymentStatus.COMPLETED, comment="Ödemenin durumu. Bankadan dönen bir ödeme 'İPTAL EDİLDİ' olarak işaretlenebilir.")

    # === DENETİM VE NOTLAR ===
    notes = db.Column(db.String(255), nullable=True, comment="Ödemeyle ilgili notlar veya banka referans numarası")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Istanbul')), comment="Bu kayıt defterine işlemin girildiği zaman damgası")
    
    # === SQLAlchemy İLİŞKİSİ ===
    loan = db.relationship('Loan', back_populates='payments')
    amortization_schedule = db.relationship('AmortizationSchedule', back_populates='payment')

    def __repr__(self):
        return f'<LoanPayment id={self.id} loan_id={self.loan_id} amount={self.amount_paid}>'