import logging
from flask import Blueprint, request, jsonify
from .services import (
    get_all_loans,
    get_loan_by_id,
    create_loan,
    update_loan,
    delete_loan,
    get_loans_by_bank_id,
    get_all_loan_types,
    get_loan_type_by_id,
    create_loan_type,
    update_loan_type,
    delete_loan_type,
    get_payments_for_loan,
    make_payment,
    get_amortization_schedule_for_loan, # Replaced generate_amortization_schedule
    get_loan_history
)
from .schemas import (
    loan_schema, 
    loans_schema,
    loan_type_schema,
    loan_types_schema,
    loan_payments_schema,
    amortization_schedules_schema # Import the new schema
)
from .models import LoanPaymentType, LoanPayment
from datetime import datetime
from decimal import Decimal
from .models import LoanPaymentType, LoanPayment
from app import db

loans_bp = Blueprint('loans_api', __name__, url_prefix='/api')

# Loan Routes
@loans_bp.route('/loans/by-bank/<int:bank_id>', methods=['GET'])
def get_loans_by_bank(bank_id):
    try:
        bank_account_id = request.args.get('bank_account_id', type=int)
        loans = get_loans_by_bank_id(bank_id, bank_account_id)
        return jsonify(loans_schema.dump(loans))
    except Exception as e:
        logging.exception(f"Error getting loans for bank {bank_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

# /back/app/loans/routes.py dosyasındaki get_loans fonksiyonu

@loans_bp.route('/loans', methods=['GET'])
def get_loans():
    try:
        loans_query = get_all_loans()
        paid_loan_ids = {p.loan_id for p in db.session.query(LoanPayment.loan_id).distinct()}
        
        loans_data = []
        for loan in loans_query:
            loan_dict = loan_schema.dump(loan)
            loan_dict['has_payments'] = loan.id in paid_loan_ids
            loans_data.append(loan_dict)
            
        # DEĞİŞİKLİK: Veriyi "data" anahtarı ile sarmalıyoruz.
        return jsonify({"data": loans_data})
    except Exception as e:
        logging.exception("Error getting loans")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loans/<int:loan_id>', methods=['GET'])
def get_loan(loan_id):
    try:
        loan = get_loan_by_id(loan_id)
        if not loan:
            return jsonify({'message': 'Loan not found'}), 404
        return jsonify(loan_schema.dump(loan))
    except Exception as e:
        logging.exception(f"Error getting loan {loan_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loans', methods=['POST'])
def add_loan():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid input"}), 400
    try:
        new_loan = create_loan(data)
        return jsonify(loan_schema.dump(new_loan)), 201
    except (ValueError, KeyError) as e:
        logging.warning(f"Invalid loan creation request: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Error creating loan")
        return jsonify({"error": "An internal server error occurred"}), 500


@loans_bp.route('/loans/<int:loan_id>', methods=['PUT'])
def edit_loan(loan_id):
    data = request.get_json()
    try:
        updated_loan = update_loan(loan_id, data)
        if not updated_loan:
            return jsonify({'message': 'Loan not found'}), 404
        return jsonify(loan_schema.dump(updated_loan))
    except Exception as e:
        logging.exception(f"Error editing loan {loan_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loans/<int:loan_id>', methods=['DELETE'])
def remove_loan(loan_id):
    try:
        deleted_loan = delete_loan(loan_id)
        if not deleted_loan:
            return jsonify({'message': 'Loan not found'}), 404
        return jsonify({'message': 'Loan deleted successfully'})
    except Exception as e:
        logging.exception(f"Error deleting loan {loan_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

# Updated Amortization Schedule Route
@loans_bp.route('/loans/<int:loan_id>/amortization-schedule', methods=['GET'])
def get_amortization_schedule(loan_id):
    """
    Retrieves the stored amortization schedule for a given loan.
    """
    try:
        schedule = get_amortization_schedule_for_loan(loan_id)
        # Wrap the result in a 'data' key to be consistent with other endpoints
        return jsonify({"data": amortization_schedules_schema.dump(schedule)}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logging.exception(f"Error getting amortization schedule for loan {loan_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loan-types', methods=['GET'])
def get_loan_types():
    try:
        loan_types = get_all_loan_types()
        # DEĞİŞİKLİK: Veriyi "data" anahtarı ile sarmalıyoruz.
        return jsonify({"data": loan_types_schema.dump(loan_types)})
    except Exception as e:
        logging.exception("Error getting loan types")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loan-types', methods=['POST'])
def add_loan_type():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"error": "Invalid input"}), 400
    try:
        new_loan_type = create_loan_type(data)
        return jsonify(loan_type_schema.dump(new_loan_type)), 201
    except Exception as e:
        logging.exception("Error creating loan type")
        return jsonify({"error": "An internal server error occurred"}), 500

# ... (other loan type routes remain the same)
@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['GET'])
def get_loan_type(loan_type_id):
    try:
        loan_type = get_loan_type_by_id(loan_type_id)
        if not loan_type:
            return jsonify({'message': 'Loan type not found'}), 404
        return jsonify(loan_type_schema.dump(loan_type))
    except Exception as e:
        logging.exception(f"Error getting loan type {loan_type_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['PUT'])
def edit_loan_type(loan_type_id):
    data = request.get_json()
    try:
        updated_loan_type = update_loan_type(loan_type_id, data)
        if not updated_loan_type:
            return jsonify({'message': 'Loan type not found'}), 404
        return jsonify(loan_type_schema.dump(updated_loan_type))
    except Exception as e:
        logging.exception(f"Error editing loan type {loan_type_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['DELETE'])
def remove_loan_type(loan_type_id):
    try:
        deleted_loan_type = delete_loan_type(loan_type_id)
        if not deleted_loan_type:
            return jsonify({'message': 'Loan type not found'}), 404
        return jsonify({'message': 'Loan type deleted successfully'})
    except Exception as e:
        logging.exception(f"Error deleting loan type {loan_type_id}")
        return jsonify({"error": "An internal server error occurred"}), 500


# LoanPayment Routes
@loans_bp.route('/loans/<int:loan_id>/payments', methods=['GET'])
def get_loan_payments(loan_id):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        paginated_payments = get_payments_for_loan(loan_id, page, per_page)
        if paginated_payments is None:
            return jsonify({'message': 'Loan not found'}), 404
            
        return jsonify({
            "data": loan_payments_schema.dump(paginated_payments.items),
            "pagination": {
                "total_pages": paginated_payments.pages,
                "total_items": paginated_payments.total,
                "current_page": paginated_payments.page
            }
        }), 200
    except Exception as e:
        logging.exception(f"Error getting payments for loan {loan_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/loans/<int:loan_id>/payments', methods=['POST'])
def add_loan_payment(loan_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid input"}), 400
    try:
        amount_paid = Decimal(data['amount_paid'])
        payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
        payment_type_str = data['payment_type']
        
        try:
            payment_type = LoanPaymentType[payment_type_str]
        except KeyError:
            return jsonify({"error": f"Invalid payment_type: {payment_type_str}"}), 400

        notes = data.get('notes')
        # Get the new installment_id from the request
        installment_id = data.get('installment_id')

        updated_loan = make_payment(
            loan_id=loan_id,
            amount_paid=amount_paid,
            payment_date=payment_date,
            payment_type=payment_type,
            notes=notes,
            installment_id=installment_id # Pass it to the service
        )
        return jsonify(loan_schema.dump(updated_loan)), 200
    except (ValueError, KeyError) as e:
        logging.warning(f"Invalid payment request for loan {loan_id}: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception(f"Error making payment for loan {loan_id}")
        return jsonify({"error": "An internal server error occurred"}), 500

@loans_bp.route('/dashboard/loan-history', methods=['GET'])
def loan_history_dashboard():
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        history_data = get_loan_history(start_date_str, end_date_str)
        
        return jsonify(history_data)
    except Exception as e:
        logging.exception("Error generating loan history dashboard")
        return jsonify({"error": "An internal server error occurred"}), 500
