

import logging
from .models import db, Bank, BankAccount, DailyBalance, StatusHistory, KmhLimit, DailyRisk
from app.credit_cards.models import CreditCard, CreditCardTransaction
from app.loans.models import Loan
from app.bank_logs.models import BankLog
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import aliased
from decimal import Decimal
from datetime import date, datetime, timedelta
from typing import Union
from sqlalchemy.orm import joinedload

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper Functions ---
def _parse_date_string(date_str: str) -> date:
    """Converts a string in YYYY-MM-DD format to a date object."""
    return datetime.strptime(date_str, '%Y-%m-%d').date()

def _to_decimal(value) -> Union[Decimal, None]:
    """Converts a value to Decimal, handling None or empty strings."""
    if value is None or value == '':
        return None
    return Decimal(str(value))

def get_exchange_rates():
    # This is a placeholder. In a real app, you'd fetch this from a service.
    return {"USD": 30.0, "EUR": 32.0, "TRY": 1.0}

# --- Bank Services ---
def get_all_banks():
    return Bank.query.all()

def create_bank(data):
    bank = Bank(name=data.get('name'), logo_url=data.get('logo_url'))
    db.session.add(bank)
    db.session.commit()
    return bank

def get_bank_summary(bank_id):
    logger.info(f"--- Starting get_bank_summary for bank_id: {bank_id} ---")
    summary = {
        "total_assets_in_try": 0.0,
        "total_credit_card_debt": 0.0,
        "total_loan_debt": 0.0,
        "total_loan_principal": 0.0
    }
    try:
        latest_bank_log = (db.session.query(BankLog).filter_by(bank_id=bank_id)
            .order_by(BankLog.date.desc(), BankLog.period.desc())
            .first())
        if latest_bank_log:
            rates = get_exchange_rates()
            total_assets = (latest_bank_log.amount_try or Decimal('0.0')) * Decimal(str(rates.get("TRY", 1.0)))
            total_assets += (latest_bank_log.amount_usd or Decimal('0.0')) * Decimal(str(rates.get("USD", 30.0)))
            total_assets += (latest_bank_log.amount_eur or Decimal('0.0')) * Decimal(str(rates.get("EUR", 32.0)))
            summary["total_assets_in_try"] = float(total_assets)
        
        cards = db.session.query(CreditCard).join(BankAccount).filter(BankAccount.bank_id == bank_id).all()
        credit_card_debt = sum(card.current_debt for card in cards)
        summary["total_credit_card_debt"] = float(credit_card_debt) if credit_card_debt else 0.0
        
        loan_summary = (db.session.query(
                func.sum(Loan.remaining_principal),
                func.sum(Loan.amount_drawn)
            ).join(BankAccount, Loan.bank_account_id == BankAccount.id)
            .filter(BankAccount.bank_id == bank_id)
            .first())
        
        loan_debt, loan_principal = loan_summary
        summary["total_loan_debt"] = float(loan_debt) if loan_debt else 0.0
        summary["total_loan_principal"] = float(loan_principal) if loan_principal else 0.0

    except Exception as e:
        logger.exception(f"An error occurred during get_bank_summary for bank_id: {bank_id}")
        raise
    logger.info(f"--- Finished get_bank_summary. Returning: {summary} ---")
    return summary

# ... (other bank services) ...

def get_bank_by_id(bank_id):
    return Bank.query.get(bank_id)

def update_bank(bank_id, data):
    bank = get_bank_by_id(bank_id)
    if not bank:
        return None
    bank.name = data.get('name', bank.name)
    bank.logo_url = data.get('logo_url', bank.logo_url)
    db.session.commit()
    return bank

def delete_bank(bank_id):
    bank = get_bank_by_id(bank_id)
    if bank:
        db.session.delete(bank)
        db.session.commit()
        return True
    return False

# --- BankAccount Services ---
def create_bank_account(data):
    try:
        new_account = BankAccount(
            name=data.get('name'),
            bank_id=data.get('bank_id'),
            iban_number=data.get('iban_number')
        )
        db.session.add(new_account)
        db.session.flush() # Use flush to get the ID before commit

        if data.get('create_kmh_limit'):
            kmh_data = {
                'bank_account_id': new_account.id,
                'name': data.get('kmh_name'),
                'kmh_limit': data.get('kmh_limit'),
                'statement_day': data.get('statement_day')
            }
            create_kmh_limit(kmh_data)
            logger.info(f"KMH limit added to session for new bank account {new_account.id}")

        db.session.commit()
        return new_account
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating bank account or KMH limit: {e}", exc_info=True)
        raise ValueError(f"Failed to create bank account or KMH limit: {e}")

def get_all_bank_accounts():
    """
    Tüm banka hesaplarını, her bir hesap için tarihsel olarak en son kaydedilmiş
    sabah ve akşam bakiyeleriyle birlikte getirir.
    """
    # 1. En son sabah bakiyesinin olduğu tarihi bulan bir alt sorgu (subquery)
    LastMorning = aliased(DailyBalance)
    latest_morning_subquery = db.session.query(
        LastMorning.bank_account_id,
        func.max(LastMorning.entry_date).label('latest_date')
    ).filter(LastMorning.morning_balance.isnot(None)).group_by(LastMorning.bank_account_id).subquery()

    # 2. En son akşam bakiyesinin olduğu tarihi bulan bir alt sorgu
    LastEvening = aliased(DailyBalance)
    latest_evening_subquery = db.session.query(
        LastEvening.bank_account_id,
        func.max(LastEvening.entry_date).label('latest_date')
    ).filter(LastEvening.evening_balance.isnot(None)).group_by(LastEvening.bank_account_id).subquery()

    # 3. Bu tarihleri ve hesap ID'lerini kullanarak asıl bakiye değerlerini çekeceğimiz takma (aliased) tablolar
    MorningBalance = aliased(DailyBalance)
    EveningBalance = aliased(DailyBalance)

    # 4. Tüm bilgileri birleştiren ana sorgu
    query = db.session.query(
        BankAccount,
        MorningBalance.morning_balance,
        EveningBalance.evening_balance
    ).outerjoin(
        latest_morning_subquery, BankAccount.id == latest_morning_subquery.c.bank_account_id
    ).outerjoin(
        MorningBalance, and_(
            MorningBalance.bank_account_id == latest_morning_subquery.c.bank_account_id,
            MorningBalance.entry_date == latest_morning_subquery.c.latest_date
        )
    ).outerjoin(
        latest_evening_subquery, BankAccount.id == latest_evening_subquery.c.bank_account_id
    ).outerjoin(
        EveningBalance, and_(
            EveningBalance.bank_account_id == latest_evening_subquery.c.bank_account_id,
            EveningBalance.entry_date == latest_evening_subquery.c.latest_date
        )
    ).options(joinedload(BankAccount.bank))

    results = query.all()

    # 5. Sonuçları daha kolay işlemek için her bir BankAccount nesnesine yeni özellikler ekleyelim
    accounts_with_balances = []
    for account, morning_balance, evening_balance in results:
        account.last_morning_balance = morning_balance
        account.last_evening_balance = evening_balance
        accounts_with_balances.append(account)

    return accounts_with_balances

def get_bank_account_by_id(account_id):
    return BankAccount.query.get(account_id)

def update_bank_account(account_id, data):
    account = get_bank_account_by_id(account_id)
    if not account:
        return None

    account.name = data.get('name', account.name)
    account.bank_id = data.get('bank_id', account.bank_id)
    account.iban_number = data.get('iban_number', account.iban_number)
    
    db.session.commit()
    return account

def delete_bank_account(account_id):
    account = get_bank_account_by_id(account_id)
    if account:
        db.session.delete(account)
        db.session.commit()
        return True
    return False

# --- KMH Services ---
def get_kmh_accounts():
    today = date.today()
    LatestRisk = aliased(DailyRisk)
    latest_risk_subquery = db.session.query(
        LatestRisk.kmh_limit_id,
        func.max(LatestRisk.entry_date).label('latest_date')
    ).group_by(LatestRisk.kmh_limit_id).subquery()
    results = db.session.query(
        KmhLimit, BankAccount, Bank, DailyRisk.morning_risk, DailyRisk.evening_risk
    ).join(BankAccount, KmhLimit.bank_account_id == BankAccount.id)\
     .join(Bank, BankAccount.bank_id == Bank.id)\
     .outerjoin(latest_risk_subquery, KmhLimit.id == latest_risk_subquery.c.kmh_limit_id)\
     .outerjoin(DailyRisk, and_(
         KmhLimit.id == DailyRisk.kmh_limit_id,
         DailyRisk.entry_date == latest_risk_subquery.c.latest_date
     )).all()
    accounts_list = []
    for kmh_limit, account, bank, morning_risk, evening_risk in results:
        accounts_list.append({
            "id": kmh_limit.id, "name": kmh_limit.name, "bank_name": bank.name,
            "kmh_limit": float(kmh_limit.kmh_limit),
            "statement_date_str": f"{kmh_limit.statement_day}",
            "current_morning_risk": float(morning_risk) if morning_risk is not None else 0,
            "current_evening_risk": float(evening_risk) if evening_risk is not None else 0,
            "status": "Aktif"
        })
    return accounts_list

def get_daily_risks_for_month(year: int, month: int):
    start_date = date(year, month, 1)
    end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    risks = db.session.query(DailyRisk).join(KmhLimit).filter(
        DailyRisk.entry_date.between(start_date, end_date)
    ).all()
    return [{
        "kmh_limit_id": risk.kmh_limit_id,
        "entry_date": risk.entry_date.isoformat(),
        "morning_risk": float(risk.morning_risk) if risk.morning_risk is not None else None,
        "evening_risk": float(risk.evening_risk) if risk.evening_risk is not None else None,
    } for risk in risks]

def save_daily_risk_entries(entries_data: list):
    if not entries_data:
        return {"message": "No data to save."}
    try:
        for entry_data in entries_data:
            kmh_limit = KmhLimit.query.join(BankAccount).join(Bank).filter(
                Bank.name == entry_data['banka'],
                KmhLimit.name == entry_data['hesap']
            ).first()
            if not kmh_limit:
                logger.warning(f"KmhLimit not found for: {entry_data['banka']} - {entry_data['hesap']}")
                continue
            entry_date = _parse_date_string(entry_data['tarih'])
            existing_entry = DailyRisk.query.filter_by(
                kmh_limit_id=kmh_limit.id, entry_date=entry_date
            ).first()
            if existing_entry:
                if 'sabah' in entry_data and entry_data['sabah'] is not None:
                    existing_entry.morning_risk = _to_decimal(entry_data['sabah'])
                if 'aksam' in entry_data and entry_data['aksam'] is not None:
                    existing_entry.evening_risk = _to_decimal(entry_data['aksam'])
            else:
                new_entry = DailyRisk(
                    kmh_limit_id=kmh_limit.id, entry_date=entry_date,
                    morning_risk=_to_decimal(entry_data.get('sabah')),
                    evening_risk=_to_decimal(entry_data.get('aksam'))
                )
                db.session.add(new_entry)
        db.session.commit()
        return {"message": "Daily risk entries saved successfully."}
    except Exception as e:
        db.session.rollback()
        logger.exception("Error saving daily risk entries.")
        raise ValueError(f"An unexpected error occurred while saving entries: {e}")

def create_kmh_limit(data):
    bank_account = BankAccount.query.get(data.get('bank_account_id'))
    if not bank_account:
        raise ValueError("Associated BankAccount not found.")
    
    new_limit = KmhLimit(
        name=data.get('name'),
        bank_account_id=data.get('bank_account_id'),
        kmh_limit=_to_decimal(data.get('kmh_limit')),
        statement_day=data.get('statement_day')
    )
    db.session.add(new_limit)
    return new_limit

def get_balance_history_for_account(bank_name: str, account_name: str):
    bank_account = BankAccount.query.join(Bank).filter(
        Bank.name == bank_name,
        BankAccount.name == account_name
    ).first()
    if not bank_account:
        return []
    
    balances = DailyBalance.query.filter_by(bank_account_id=bank_account.id).order_by(DailyBalance.entry_date.asc()).all()
    return [{
        "entry_date": b.entry_date.isoformat(),
        "morning_balance": float(b.morning_balance) if b.morning_balance is not None else None,
        "evening_balance": float(b.evening_balance) if b.evening_balance is not None else None,
    } for b in balances]

# --- Daily Balance Services (for VADESIZ accounts) ---
def get_daily_balances_for_month(year: int, month: int):
    """
    Belirtilen ay için günlük bakiye kayıtlarını, ilişkili hesap ve banka
    bilgileriyle birlikte TEK BİR SORGUIDA verimli bir şekilde çeker.
    """
    start_date = date(year, month, 1)
    next_month = start_date.replace(day=28) + timedelta(days=4)
    end_date = next_month - timedelta(days=next_month.day)

    query_result = DailyBalance.query.options(
        joinedload(DailyBalance.account).joinedload(BankAccount.bank)
    ).filter(
        DailyBalance.entry_date.between(start_date, end_date)
    ).all()

    # SQLAlchemy nesnelerini doğrudan döndürmek yerine güvenli bir şekilde dict listesine çevirelim
    result_list = []
    for balance in query_result:
        result_list.append({
            'id': balance.id,
            'bank_account_id': balance.bank_account_id,
            'entry_date': balance.entry_date.isoformat(),
            'morning_balance': balance.morning_balance,
            'evening_balance': balance.evening_balance,
            # İlişkili verileri kontrol ederek güvenli bir şekilde ekleyelim
            'account_name': balance.account.name if balance.account else None,
            'bank_name': balance.account.bank.name if balance.account and balance.account.bank else None,
        })
    return result_list



def save_daily_balance_entries(entries_data: list):
    if not entries_data:
        return {"message": "Kaydedilecek veri bulunamadı."}
    
    try:
        # Gelen veriyi hesap bazında gruplayarak her birini ayrı ayrı işleyelim
        entries_by_account_key = {}
        for entry in entries_data:
            key = (entry['banka'], entry['hesap'])
            if key not in entries_by_account_key:
                entries_by_account_key[key] = []
            entries_by_account_key[key].append(entry)

        for (bank_name, account_name), entries in entries_by_account_key.items():
            # Model adını 'BankAccount' olarak güncelledik
            account = BankAccount.query.join(Bank).filter(
                Bank.name == bank_name, BankAccount.name == account_name
            ).first()
            if not account:
                logger.warning(f"Hesap bulunamadı: {bank_name} - {account_name}")
                continue

            # O hesaba ait gelen tüm girişleri tarihe göre sırala
            sorted_entries = sorted(entries, key=lambda x: _parse_date_string(x['tarih']))
            
            for entry_data in sorted_entries:
                submission_date = _parse_date_string(entry_data['tarih'])
                
                # 1. Adım: Gönderilen tarihten önceki en son kaydı bul
                last_record = DailyBalance.query.filter(
                    DailyBalance.bank_account_id == account.id,
                    DailyBalance.entry_date < submission_date
                ).order_by(DailyBalance.entry_date.desc()).first()

                # 2. Adım: Boşluk doldurma için kullanılacak değeri belirle
                fill_value = None
                if last_record:
                    fill_value = last_record.evening_balance if last_record.evening_balance is not None else last_record.morning_balance
                    
                    # Son kaydın eksik akşamını doldur
                    if last_record.evening_balance is None and fill_value is not None:
                        last_record.evening_balance = fill_value
                        db.session.add(last_record)
                        logger.info(f"Doldurma: {account.name} - {last_record.entry_date} akşamı {fill_value} ile tamamlandı.")


                # 3. Adım: Boşlukları doldur (Gap Filling)
                if last_record and fill_value is not None:
                    gap_date = last_record.entry_date + timedelta(days=1)
                    while gap_date < submission_date:
                        existing_gap = DailyBalance.query.filter_by(bank_account_id=account.id, entry_date=gap_date).first()
                        if not existing_gap:
                            db.session.add(DailyBalance(
                                bank_account_id=account.id, entry_date=gap_date,
                                morning_balance=fill_value,
                                evening_balance=fill_value
                            ))
                            logger.info(f"Doldurma: {account.name} - {gap_date} günü {fill_value} ile oluşturuldu.")
                        gap_date += timedelta(days=1)
                
                # 4. Adım: Gelen asıl kaydı işle
                sabah_input = _to_decimal(entry_data.get('sabah'))
                aksam_input = _to_decimal(entry_data.get('aksam'))

                existing_entry = DailyBalance.query.filter_by(bank_account_id=account.id, entry_date=submission_date).first()

                if existing_entry:
                    # Var olan kaydı güncelle
                    if sabah_input is not None:
                        existing_entry.morning_balance = sabah_input
                    if aksam_input is not None:
                        existing_entry.evening_balance = aksam_input
                    # Sizin kodunuzdaki önemli kural: Eğer sadece sabah girildiyse ve akşam boşsa,
                    # veritabanındaki akşam değerini de NULL yap.
                    elif sabah_input is not None and aksam_input is None:
                        existing_entry.evening_balance = None
                    db.session.add(existing_entry)
                else:
                    # Yeni kayıt oluştur
                    final_sabah = sabah_input
                    if final_sabah is None:
                        final_sabah = fill_value  # Sabah girilmediyse, bir önceki günden al

                    db.session.add(DailyBalance(
                        bank_account_id=account.id,
                        entry_date=submission_date,
                        morning_balance=final_sabah,
                        evening_balance=aksam_input  # Akşam girilmediyse None (NULL) kalır
                    ))

        db.session.commit()
        return {"message": "Günlük girişler başarıyla kaydedildi."}
    except Exception as e:
        db.session.rollback()
        logger.exception("Günlük girişler kaydedilirken bir hata oluştu.")
        raise ValueError(f"Girişler kaydedilirken beklenmedik bir hata oluştu: {e}")
    
# --- Status History Services (Generic for now) ---
def get_status_history(subject_type: str, subject_id: int):
    # --- DEĞİŞİKLİK: Sorguyu yeni alanlara göre güncelliyoruz ---
    return StatusHistory.query.filter_by(
        subject_id=subject_id,
        subject_type=subject_type
    ).order_by(StatusHistory.start_date.desc()).all()


def save_status(data: dict):
    """
    Bir objenin (Banka Hesabı, KMH vb.) durumunu akıllıca günceller.
    """
    subject_type = data.get('subject_type')
    # --- DEĞİŞİKLİK: bank_account_id yerine subject_id kullanıyoruz ---
    subject_id = data.get('subject_id') or data.get('bank_account_id') # Geriye uyumluluk için
    new_status = data.get('status')
    new_start_date_str = data.get('start_date')
    new_reason = data.get('reason')

    if not all([subject_id, subject_type, new_status, new_start_date_str]):
            raise ValueError("Gerekli alanlar eksik: subject_id, subject_type, status, start_date.")
    
    new_start_date = _parse_date_string(new_start_date_str)

    # 1. Mevcut aktif durumu (end_date'i NULL olan) bul
    current_status = StatusHistory.query.filter(
        StatusHistory.subject_id == subject_id,
        StatusHistory.subject_type == subject_type,
        StatusHistory.end_date.is_(None)
    ).order_by(StatusHistory.start_date.desc()).first()

    # 2. Mevcut durumu sonlandır
    if current_status and current_status.status != new_status:
        end_date_for_old_status = new_start_date - timedelta(days=1)
        if end_date_for_old_status >= current_status.start_date:
            current_status.end_date = end_date_for_old_status
            db.session.add(current_status)

    # 3. Yeni durumu ekle
    if not current_status or current_status.status != new_status:
            new_status_entry = StatusHistory(
                subject_id=subject_id,
                subject_type=subject_type,
                status=new_status,
                start_date=new_start_date,
                end_date=None,
                reason=new_reason
            )
            db.session.add(new_status_entry)

    db.session.commit()
    return {"message": "Durum başarıyla güncellendi."}