from app.company.services import company_service
from app.company.schemas import CompanySchema
from app.route_factory import create_api_blueprint

# Create the blueprint using the generic factory
company_bp = create_api_blueprint('companies', company_service, CompanySchema())