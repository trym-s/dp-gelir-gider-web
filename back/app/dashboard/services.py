from app.banks.models import Bank
from sqlalchemy.orm import joinedload
from app.banks.schemas import BankSchema, BankAccountSchema

def get_banks_with_accounts_data():
    """
    Fetches all banks and their associated accounts, structured for dashboard display.
    Note: joinedload is removed because Bank.accounts is a lazy='dynamic' relationship.
    """
    banks = Bank.query.order_by(Bank.name).all()
    
    # Manually serialize to the desired structure
    result = []
    # Schemas are not used here to construct the exact desired output
    # bank_schema = BankSchema()
    # account_schema = BankAccountSchema(many=True)

    for bank in banks:
        # Accessing bank.accounts here will trigger a separate query for each bank
        accounts_data = [
            {
                "id": acc.id,
                "name": acc.name,
                "iban": getattr(acc, 'iban', None), # Safely access iban
                "currency": getattr(acc, 'currency', 'TRY') # Safely access currency
            } for acc in bank.accounts
        ]

        bank_data = {
            "id": bank.id,
            "name": bank.name,
            "logo_url": bank.logo_url,
            "accounts": accounts_data
        }
        result.append(bank_data)
        
    return result
