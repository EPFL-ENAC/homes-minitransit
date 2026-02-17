import type { DataDrivenPropertyValueSpecification, GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";
import { lngLatOffsetToHexagonCenter } from "src/lib/designs/hexagons/hexagonsUtils";
import type { RideAction, SimulationRoute, WalkAction } from "src/stores/simulation";
import type { HexagonMesh } from "../hexagons/hexagonMesh";
import type { TransitSystemDesign } from "../transitSystemDesign";

// const colorsFromActionType: DataDrivenPropertyValueSpecification<string> = ["match", ["get", "actionType"], "Ride", "#FF00FF", "Walk", "#00FF00", "#CCCCCC"];
const colorsFromActionType: DataDrivenPropertyValueSpecification<string> = "#000000"; // For now, let's just use the same color for everything to avoid confusion with the design colors. We can always add more colors later if needed.

export class RoutesMesh {
    private uuid = crypto.randomUUID();
    private map: MaplibreMap | null = null;
    private source: GeoJSONSource | null = null;
    private routes: SimulationRoute[] = [];

    get sourceId() {
        return `route-mesh-source-${this.uuid}`;
    }

    get lineLayerId() {
        return `route-mesh-lines-${this.uuid}`;
    }

    get arrowLayerId() {
        return `route-mesh-arrows-${this.uuid}`;
    }

    get pointsLayerId() {
        return `route-points-${this.uuid}`;
    }

    setRoutes(routes: SimulationRoute[], hexagons: HexagonMesh, design: TransitSystemDesign | null) {
        this.routes = routes;
        if (this.source) {
            this.source.setData(this.generateGeoJSON(hexagons, design));
        }
    }

    private generateGeoJSON(hexagons: HexagonMesh, design: TransitSystemDesign | null): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
        const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];

        if (this.routes.length > 0) {
            features.push(this.generateStartGeoJSON(hexagons));
        }

        for (const route of this.routes) {
            for (const action of route.actions) {
                if (action.type === "Walk") {
                    const walkGeoJSON = this.generateWalkGeoJSON(action, hexagons);
                    features.push(...walkGeoJSON.features);
                } else if (action.type === "Ride" && design) {
                    const rideGeoJSON = this.generateRideGeoJSON(action, hexagons, design);
                    features.push(...rideGeoJSON.features);
                } else if (action.type === "Wait") {
                    // We could also visualize waiting, but for now let's skip it since it's less critical to show on the map
                }
            }
        }

        return {
            type: "FeatureCollection",
            features,
        };
    }

    private generateStartGeoJSON(hexagons: HexagonMesh): GeoJSON.Feature<GeoJSON.Geometry> {
        return {
            type: "Feature",
            properties: { actionType: "start", kind: "point" },
            geometry: {
                type: "Point",
                coordinates: hexagons.getCoordinatesOfIds([this.routes[0]!.actions[0]!.start_hex], lngLatOffsetToHexagonCenter)[0]!,
            },
        };
    }

    private generateWalkGeoJSON(action: WalkAction, hexagons: HexagonMesh): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
        const coords = hexagons.getCoordinatesOfIds(
            action.walk_path,
            lngLatOffsetToHexagonCenter,
        );

        if (coords.length >= 2) {
            return {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: { actionType: action.type, kind: "line" },
                        geometry: { type: "LineString", coordinates: coords },
                    },
                    {
                        type: "Feature",
                        properties: {
                            actionType: action.type,
                            kind: "tip",
                            angle: this.calculateAngle(coords.at(-2)!, coords.at(-1)!),
                        },
                        geometry: { type: "Point", coordinates: coords.at(-1)! },
                    },
                ],
            };
        }

        return {
            type: "FeatureCollection",
            features: [],
        };
    }

    private generateRideGeoJSON(action: RideAction, hexagons: HexagonMesh, design: TransitSystemDesign): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
        const service = design.fixedRouteServices.find(s => s.name === action.service_name)?.toJSON();
        if (!service) {
            console.warn(`Service ${action.service_name} not found in design`);
            return {
                type: "FeatureCollection",
                features: [],
            };
        }

        const startIndex = service.stops.findIndex(s => s === action.start_hex);
        const endIndex = service.stops.findIndex(s => s === action.end_hex);
        const stops = service.stops.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
        if (endIndex < startIndex) {
            stops.reverse();
        }

        const coords = hexagons.getCoordinatesOfIds(
            stops,
            lngLatOffsetToHexagonCenter,
        );

        if (coords.length >= 2) {
            return {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: { actionType: action.type, kind: "line" },
                        geometry: { type: "LineString", coordinates: coords },
                    },
                    {
                        type: "Feature",
                        properties: {
                            actionType: action.type,
                            kind: "tip",
                            angle: this.calculateAngle(coords.at(-2)!, coords.at(-1)!),
                        },
                        geometry: { type: "Point", coordinates: coords.at(-1)! },
                    },
                ],
            };
        }

        return {
            type: "FeatureCollection",
            features: [],
        };
    }

    private calculateAngle(start: [number, number], end: [number, number]): number {
        return (Math.atan2(end[1] - start[1], end[0] - start[0]) * 180) / Math.PI * -1 + 90;
    }

    drawOnMap(m: MaplibreMap, beforeLayerId?: string) {
        this.map = m;

        if (!m.getSource(this.sourceId)) {
            m.addSource(this.sourceId, {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            this.source = m.getSource(this.sourceId) as GeoJSONSource;

            m.addLayer({
                id: this.pointsLayerId,
                type: "circle",
                source: this.sourceId,
                filter: ["==", ["get", "kind"], "point"], // Only draw point features
                paint: {
                    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 14, 10],
                    "circle-color": colorsFromActionType,
                    "circle-stroke-color": "#FFFFFF",
                    "circle-stroke-width": 1,
                },
            }, beforeLayerId);

            m.addLayer({
                id: this.lineLayerId,
                type: "line",
                source: this.sourceId,
                filter: ["==", ["get", "kind"], "line"], // Only draw line features
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": colorsFromActionType,
                    "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 14, 6],
                },
            }, beforeLayerId);

            m.addLayer({
                id: this.arrowLayerId,
                type: "symbol",
                source: this.sourceId,
                filter: ["==", ["get", "kind"], "tip"], // Only draw point features
                layout: {
                    "text-field": "▲",
                    "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 20, 18, 40],
                    "text-rotate": ["get", "angle"],
                    "text-rotation-alignment": "map",
                    "text-pitch-alignment": "map", // This keeps it flat if the map is tilted
                    "text-anchor": "center",       // Switch to center
                    "text-offset": [0, -0.1],      // Negative Y moves it "up" in its own coordinate space
                    "text-allow-overlap": true,
                    "text-ignore-placement": true,
                    "text-padding": 0,
                },
                paint: {
                    "text-color": colorsFromActionType,
                },
            }, beforeLayerId);
        }
    }

    removeFromMap() {
        if (!this.map) return;

        if (this.map.getLayer(this.lineLayerId)) {
            this.map.removeLayer(this.lineLayerId);
        }
        if (this.map.getLayer(this.arrowLayerId)) {
            this.map.removeLayer(this.arrowLayerId);
        }
        if (this.map.getSource(this.sourceId)) {
            this.map.removeSource(this.sourceId);
        }

        this.map = null;
        this.source = null;
    }
}