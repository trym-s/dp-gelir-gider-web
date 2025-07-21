from app.payment_type.services import payment_type_service
from app.payment_type.schemas import PaymentTypeSchema
from app.route_factory import create_api_blueprint

payment_type_bp = create_api_blueprint('payment-types', payment_type_service, PaymentTypeSchema())