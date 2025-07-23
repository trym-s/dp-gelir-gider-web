import logging
from flask import Blueprint, request, jsonify
from .services import (
    get_all_loans,
    get_loan_by_id,
    create_loan,
    update_loan,
    delete_loan,
    get_all_loan_types,
    get_loan_type_by_id,
    create_loan_type,
    update_loan_type,
    delete_loan_type,
    get_payments_for_loan,
    make_payment,
    get_amortization_schedule_for_loan # Replaced generate_amortization_schedule
)
from .schemas import (
    loan_schema, 
    loans_schema,
    loan_type_schema,
    loan_types_schema,
    loan_payments_schema,
    amortization_schedules_schema # Import the new schema
)
from .models import LoanPaymentType
from datetime import datetime
from decimal import Decimal

loans_bp = Blueprint('loans_api', __name__, url_prefix='/api')

# Loan Routes
@loans_bp.route('/loans', methods=['GET'])
def get_loans():
    try:
        loans = get_all_loans()
        return jsonify(loans_schema.dump(loans))
    except Exception as e:
        logging.exception("Error getting loans")
        return jsonify({"error": str(e)}), 500

@loans_bp.route('/loans/<int:loan_id>', methods=['GET'])
def get_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if not loan:
        return jsonify({'message': 'Loan not found'}), 404
    return jsonify(loan_schema.dump(loan))

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
    updated_loan = update_loan(loan_id, data)
    if not updated_loan:
        return jsonify({'message': 'Loan not found'}), 404
    return jsonify(loan_schema.dump(updated_loan))

@loans_bp.route('/loans/<int:loan_id>', methods=['DELETE'])
def remove_loan(loan_id):
    deleted_loan = delete_loan(loan_id)
    if not deleted_loan:
        return jsonify({'message': 'Loan not found'}), 404
    return jsonify({'message': 'Loan deleted successfully'})

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

# LoanType Routes
@loans_bp.route('/loan-types', methods=['GET'])
def get_loan_types():
    try:
        loan_types = get_all_loan_types()
        return jsonify(loan_types_schema.dump(loan_types))
    except Exception as e:
        logging.exception("Error getting loan types")
        return jsonify({"error": str(e)}), 500

# ... (other loan type routes remain the same)
@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['GET'])
def get_loan_type(loan_type_id):
    loan_type = get_loan_type_by_id(loan_type_id)
    if not loan_type:
        return jsonify({'message': 'Loan type not found'}), 404
    return jsonify(loan_type_schema.dump(loan_type))

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['PUT'])
def edit_loan_type(loan_type_id):
    data = request.get_json()
    updated_loan_type = update_loan_type(loan_type_id, data)
    if not updated_loan_type:
        return jsonify({'message': 'Loan type not found'}), 404
    return jsonify(loan_type_schema.dump(updated_loan_type))

@loans_bp.route('/loan-types/<int:loan_type_id>', methods=['DELETE'])
def remove_loan_type(loan_type_id):
    deleted_loan_type = delete_loan_type(loan_type_id)
    if not deleted_loan_type:
        return jsonify({'message': 'Loan type not found'}), 404
    return jsonify({'message': 'Loan type deleted successfully'})


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
