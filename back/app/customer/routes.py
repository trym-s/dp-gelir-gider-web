from app.customer.services import CustomerService 
from .schemas import CustomerSchema
from app.route_factory import create_api_blueprint

# Create the blueprint using the generic factory
customer_bp = create_api_blueprint('customer', CustomerService, CustomerSchema())