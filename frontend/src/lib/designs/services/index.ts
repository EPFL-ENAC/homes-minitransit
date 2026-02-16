import { FixedRouteService, type FixedRouteServiceHexagonInfo } from "./fixedRouteService";
import { OnDemandDockedService, type OnDemandDockedServiceHexagonInfo } from "./onDemandDockedService";
import { OnDemandFreeFloatingService, type OnDemandFreeFloatingServiceHexagonInfo } from "./onDemandFreeFloatingService";

export { FixedRouteService };
export { OnDemandDockedService };
export { OnDemandFreeFloatingService };

export type DesignService =
    | FixedRouteService
    | OnDemandDockedService
    | OnDemandFreeFloatingService;


export type ServiceHexagonInfo = FixedRouteServiceHexagonInfo | OnDemandDockedServiceHexagonInfo | OnDemandFreeFloatingServiceHexagonInfo;