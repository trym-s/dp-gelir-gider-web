import pytest
from app import create_app, db
from app.expense.models import Expense, Payment
from app.region.models import Region
from app.payment_type.models import PaymentType
from app.account_name.models import AccountName
from app.budget_item.models import BudgetItem
import datetime

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Add dependencies for foreign key constraints
            region = Region(name='Test Region')
            db.session.add(region)
            db.session.commit()
            payment_type = PaymentType(name='Test Payment Type', region_id=region.id)
            db.session.add(payment_type)
            db.session.commit()
            account_name = AccountName(name='Test Account Name', payment_type_id=payment_type.id)
            db.session.add(account_name)
            db.session.commit()
            budget_item = BudgetItem(name='Test Budget Item', account_name_id=account_name.id)
            db.session.add(budget_item)
            db.session.commit()
            yield client
            db.session.remove()
            db.drop_all()

def test_get_summary(client):
    print("\n--- Running test_get_summary ---")
    # Create an expense
    expense_response = client.post('/api/expenses/', json={
        'description': 'Test Expense',
        'amount': 100.00,
        'date': datetime.date.today().isoformat(),
        'region_id': 1,
        'payment_type_id': 1,
        'account_name_id': 1,
        'budget_item_id': 1
    })
    expense_id = expense_response.json['id']

    # Create a payment for the expense
    client.post(f'/api/expenses/{expense_id}/payments', json={
        'payment_amount': 50.00,
        'payment_date': datetime.date.today().isoformat()
    })

    response = client.get('/api/summary')
    assert response.status_code == 200
    assert response.json['total_expenses'] == 100.00
    assert response.json['total_payments'] == 50.00
    assert response.json['total_remaining_amount'] == 50.00
    print("test_get_summary: PASSED")
