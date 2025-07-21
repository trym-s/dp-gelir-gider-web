from app.account_name.services import account_name_service
from app.account_name.schemas import AccountNameSchema
from app.route_factory import create_api_blueprint

account_name_bp = create_api_blueprint('account-names', account_name_service, AccountNameSchema())
