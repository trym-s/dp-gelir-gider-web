from app.customer.models import Customer
from app.base_service import BaseService

# Instantiate the generic service for the Customer model
CustomerService = BaseService(Customer)