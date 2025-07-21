from app.budget_item.services import budget_item_service
from app.budget_item.schemas import BudgetItemSchema
from app.route_factory import create_api_blueprint

budget_item_bp = create_api_blueprint('budget-items', budget_item_service, BudgetItemSchema())
