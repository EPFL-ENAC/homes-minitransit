import type { HexagonMesh } from "./hexagons/hexagonMesh";
import { type DesignService, FixedRouteService, OnDemandDockedService, OnDemandFreeFloatingService } from "./services";
import type { BaseDesignService } from "./services/base";
import type { TransitSystemDesignJSON } from "./types";
import type { Map as MaplibreMap } from 'maplibre-gl';


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

    drawOnMap(m: MaplibreMap, hexagons: HexagonMesh, onServiceClicked?: (service: DesignService) => void) {
        this.removeFromMap();
        this.map = m;

        const designColors = ["#FF0000", "#0000FF", "#00FF00", "#FFA500", "#800080", "#00FFFF", "#FFC0CB", "#808000"];

        for (let i = 0; i < this.services.length; i++) {
            const service = this.services[i]!;
            const color = designColors[i % designColors.length];

            service.drawOnMap(this.map, hexagons, color);
            if (onServiceClicked) {
                service.onClicked(this.map, onServiceClicked as (service: BaseDesignService<object>) => void);
            }
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
}