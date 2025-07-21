from app.region.services import region_service
from app.region.schemas import RegionSchema
from app.route_factory import create_api_blueprint

region_bp = create_api_blueprint('regions', region_service, RegionSchema())
