import type { GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";
import { lngLatOffsetToHexagonCenter } from "src/lib/designs/hexagons/hexagonsUtils";
import type { SimulationRoute } from "src/stores/simulation";
import type { HexagonMesh } from "../hexagons/hexagonMesh";

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

    setRoutes(routes: SimulationRoute[], hexagons: HexagonMesh) {
        this.routes = routes;
        if (this.source) {
            this.source.setData(this.generateGeoJSON(hexagons));
        }
    }

    private generateGeoJSON(hexagons: HexagonMesh): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
        const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];

        for (const route of this.routes) {
            for (const action of route.actions) {
                const coords = hexagons.getCoordinatesOfIds(
                    [action.start_hex, action.end_hex],
                    lngLatOffsetToHexagonCenter,
                );

                /* if (coords.length === 2) {
                    features.push({
                        type: "Feature",
                        properties: {
                            actionType: action.type,
                        },
                        geometry: {
                            type: "LineString",
                            coordinates: coords,
                        },
                    });
                } */

                if (coords.length === 2) {
                    // 1. The Line
                    features.push({
                        type: "Feature",
                        properties: { actionType: action.type, kind: "line" },
                        geometry: { type: "LineString", coordinates: coords },
                    });

                    // 2. The Tip (Point)
                    // We calculate the angle between the two points so the arrow rotates correctly
                    const angle = this.calculateAngle(coords[0]!, coords[1]!);

                    features.push({
                        type: "Feature",
                        properties: {
                            actionType: action.type,
                            kind: "tip",
                            angle: angle
                        },
                        geometry: { type: "Point", coordinates: coords[1]! },
                    });
                }
            }
        }

        return {
            type: "FeatureCollection",
            features,
        };
    }

    private calculateAngle(start: [number, number], end: [number, number]): number {
        return (Math.atan2(end[1] - start[1], end[0] - start[0]) * 180) / Math.PI * -1 + 90;
    }

    drawOnMap(m: MaplibreMap) {
        this.map = m;

        if (!m.getSource(this.sourceId)) {
            m.addSource(this.sourceId, {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            this.source = m.getSource(this.sourceId) as GeoJSONSource;

            m.addLayer({
                id: this.lineLayerId,
                type: "line",
                source: this.sourceId,
                filter: ["==", ["get", "kind"], "line"], // Only draw line features
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": ["match", ["get", "actionType"], "Ride", "#FF00FF", "Walk", "#00FF00", "#CCCCCC"],
                    "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 14, 6]
                },
            });

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
                    "text-color": ["match", ["get", "actionType"], "Ride", "#FF00FF", "Walk", "#00FF00", "#CCCCCC"],
                },
            });
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