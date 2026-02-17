import type { HexagonMesh } from "./hexagons/hexagonMesh";
import { type DesignService, FixedRouteService, OnDemandDockedService, OnDemandFreeFloatingService, type ServiceHexagonInfo } from "./services";
import type { TransitSystemDesignJSON } from "./types";
import type { MapGeoJSONFeature, Map as MaplibreMap } from 'maplibre-gl';

export class TransitSystemDesign {
    fixedRouteServices: FixedRouteService[] = [];
    onDemandDockedServices: OnDemandDockedService[] = [];
    onDemandFreeFloatingServices: OnDemandFreeFloatingService[] = [];

    private map: MaplibreMap | null = null;

    constructor() { }

    get services(): DesignService[] {
        return [
            ...this.fixedRouteServices,
            ...this.onDemandDockedServices,
            ...this.onDemandFreeFloatingServices,
        ];
    }

    static fromJSON(json: TransitSystemDesignJSON): TransitSystemDesign {
        const design = new TransitSystemDesign();

        design.fixedRouteServices = json.fixed_route_services.map(fr => FixedRouteService.fromJSON(fr));

        design.onDemandDockedServices = json.ondemand_services
            .filter(ods => ods.type === "docked")
            .map(ods => OnDemandDockedService.fromJSON(ods));

        design.onDemandFreeFloatingServices = json.ondemand_services
            .filter(ods => ods.type === "free-floating")
            .map(ods => OnDemandFreeFloatingService.fromJSON(ods));

        design.services.forEach((service, index) => {
            const hue = (index * 360) / design.services.length;
            service.hue = hue;
        });

        return design;
    }

    toJSON(): TransitSystemDesignJSON {
        return {
            fixed_route_services: this.fixedRouteServices.map(s => s.toJSON()),
            ondemand_services: [
                ...this.onDemandDockedServices.map(s => s.toJSON()),
                ...this.onDemandFreeFloatingServices.map(s => s.toJSON()),
            ],
        }
    }

    drawOnMap(m: MaplibreMap, hexagons: HexagonMesh, beforeLayerId?: string) {
        this.removeFromMap();
        this.map = m;

        for (let i = 0; i < this.services.length; i++) {
            const service = this.services[i]!;

            service.drawOnMap(this.map, hexagons, beforeLayerId);
        }
    }

    selectService(name: string | null) {
        for (const service of this.services) {
            service.setSelected(service.name === name);
        }
    }

    removeFromMap() {
        for (const service of this.services) {
            service.removeFromMap();
        }
    }

    setVisibleServices(serviceNames: Set<string>) {
        for (const service of this.services) {
            service.toggleVisibility(serviceNames.has(service.name));
        }
    }

    infoForHexagon(hexId: number): ServiceHexagonInfo[] {
        const info: ServiceHexagonInfo[] = [];

        for (const service of this.services) {
            const hexInfo = service.infoForHexagon(hexId);
            if (hexInfo) {
                info.push(hexInfo);
            }
        }

        return info;
    }

    shouldCaptureClick(features: MapGeoJSONFeature[]): string | false {
        for (const service of this.services) {
            if (service.shouldCaptureClick(features)) {
                return service.name;
            }
        }
        return false;
    }
}