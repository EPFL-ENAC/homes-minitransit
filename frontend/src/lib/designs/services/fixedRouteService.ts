import type { FixedRouteServiceJSON } from "../types";
import type { Map as MaplibreMap } from 'maplibre-gl';
import { BaseDesignService, type DesignVisualState } from "./base";
import type { HexagonMesh } from "../hexagons/hexagonMesh";

export interface FixedRouteServiceHexagonInfo {
    service: FixedRouteService;
    type: "fixed_route"
    stopId: number;
}

export class FixedRouteService extends BaseDesignService<FixedRouteServiceJSON> {
    static fromJSON(json: FixedRouteServiceJSON): FixedRouteService {
        return new FixedRouteService(json.name, json);
    }

    get geojsonSourceId(): string {
        return `fixed_route_service_${this.name}_source`;
    }

    get lineLayerId(): string {
        return `fixed_route_service_${this.name}_line_layer`;
    }

    get stopsLayerId(): string {
        return `fixed_route_service_${this.name}_stops_layer`;
    }

    get layerIds(): string[] {
        return [this.lineLayerId, this.stopsLayerId];
    }

    get fixedRouteService(): FixedRouteServiceJSON {
        return this.serviceData;
    }

    override drawOnMap(m: MaplibreMap, hexagons: HexagonMesh, color: string = "#FF0000") {
        super.drawOnMap(m, hexagons, color);

        const coordsFromHexagons = hexagons.getCoordinatesOfIds(this.fixedRouteService.stops);

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
            id: this.lineLayerId,
            type: "line",
            source: this.geojsonSourceId,
            paint: {
                "line-color": color,
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    5, 1,
                    10, 3,
                    14, 8,
                    18, 16
                ],
            },
        });

        m.addLayer({
            id: this.stopsLayerId,
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
        });
    }

    override setVisualState(state: DesignVisualState) {
        super.setVisualState(state);

        if (!this.map) return;

        const opacity = state === "normal" ? 0.6 : 1;

        this.map.setPaintProperty(this.lineLayerId, "line-opacity", opacity);
        this.map.setPaintProperty(this.stopsLayerId, "circle-opacity", opacity);

        const multiplier = state === "selected" ? 1.65 : 1;
        this.map.setPaintProperty(this.lineLayerId, "line-width", [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 1 * multiplier,
            10, 3 * multiplier,
            14, 8 * multiplier,
            18, 16 * multiplier
        ]);
        this.map.setPaintProperty(this.stopsLayerId, "circle-radius", [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 1 * multiplier,
            10, 2 * multiplier,
            14, 10 * multiplier,
            18, 48 * multiplier
        ]);
    }

    override infoForHexagon(hexId: number): FixedRouteServiceHexagonInfo | null {
        const index = this.fixedRouteService.stops.indexOf(hexId);
        if (index !== -1) {
            return {
                service: this,
                type: "fixed_route",
                stopId: index,
            } as FixedRouteServiceHexagonInfo;
        }
        return null;
    }
}