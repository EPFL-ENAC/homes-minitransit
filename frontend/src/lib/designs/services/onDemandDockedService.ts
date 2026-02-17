import type { OnDemandServiceJSON } from "../types";
import type { Map as MaplibreMap } from 'maplibre-gl';
import { BaseDesignService, type DesignVisualState } from "./base";
import type { HexagonMesh } from "../hexagons/hexagonMesh";

export interface OnDemandDockedServiceHexagonInfo {
    service: OnDemandDockedService;
    type: "on_demand_docked"
    dockId: number;
    dockCapacity: number;
}

export class OnDemandDockedService extends BaseDesignService<OnDemandServiceJSON> {
    static fromJSON(json: OnDemandServiceJSON): OnDemandDockedService {
        return new OnDemandDockedService(json.name, json);
    }

    get geojsonSourceId(): string {
        return `on_demand_docked_service_${this.name}_source`;
    }

    get dockingStationsLayerId(): string {
        return `on_demand_docked_service_${this.name}_docking_stations_layer`;
    }

    get layerIds(): string[] {
        return [this.dockingStationsLayerId];
    }

    get onDemandService(): OnDemandServiceJSON {
        return this.serviceData;
    }

    override drawOnMap(m: MaplibreMap, hexagons: HexagonMesh, beforeLayerId?: string) {
        const cleanUp = super.drawOnMap(m, hexagons, beforeLayerId);
        const color = `hsl(${this.hue}, 100%, 50%)`;

        const coordsFromHexagons = hexagons.getCoordinatesOfIds(this.onDemandService.docking_stations.map(ds => ds.location));

        const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
            type: "Feature",
            properties: {
                service_name: this.name,
                promoteId: "service_name",
            },
            geometry: {
                type: "LineString",
                coordinates: coordsFromHexagons,
            },
        };

        const routeGeoJson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [lineString],
        };

        m.addSource(this.geojsonSourceId, {
            type: "geojson",
            data: routeGeoJson,
        });

        m.addLayer({
            id: this.dockingStationsLayerId,
            type: "circle",
            source: this.geojsonSourceId,
            paint: {
                "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5, 1,
                    10, 2,
                    14, 10,
                    18, 48
                ],
                "circle-color": color,
            }
        }, beforeLayerId);
        return cleanUp;
    }

    override setVisualState(state: DesignVisualState) {
        if (!this.map) return;

        super.setVisualState(state);

        const opacity = state === "normal" ? 0.6 : 1;

        this.map.setPaintProperty(this.dockingStationsLayerId, "circle-opacity", opacity);
    }

    override infoForHexagon(hexId: number): OnDemandDockedServiceHexagonInfo | null {
        const dockingStation = this.onDemandService.docking_stations.find(ds => ds.location === hexId);
        if (dockingStation) {
            return {
                service: this,
                dockId: dockingStation.location,
                type: "on_demand_docked",
                dockCapacity: dockingStation.capacity,
            };
        }
        return null;
    }
}