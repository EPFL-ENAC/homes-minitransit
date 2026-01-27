import { FixedRouteService } from "./fixedRouteService";
import { OnDemandDockedService } from "./onDemandDockedService";
import { OnDemandFreeFloatingService } from "./onDemandFreeFloatingService";

export { FixedRouteService };
export { OnDemandDockedService };
export { OnDemandFreeFloatingService };

export type DesignService =
    | FixedRouteService
    | OnDemandDockedService
    | OnDemandFreeFloatingService;