import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import type { HexagonGeoJSON } from "src/stores/gameAreasStore";
import type { Map as MaplibreMap } from "maplibre-gl";
import { getCoordsFromHexagons, lngLatOffsetToHexagonCenter } from "src/lib/designs/hexagons/hexagonsUtils";

export class HexagonMesh {
    geoJson: HexagonGeoJSON | null = null;
    source: GeoJSONSource | null = null;

    private demandKey: string | null = null;
    private uuid = crypto.randomUUID();
    private hoveredHexId: number | null = null;
    private cleanup: (() => void)[] = [];
    private map: MaplibreMap | null = null;

    get hoveredHexagonId() {
        return this.hoveredHexId;
    }

    get sourceId() {
        return `hexagon-mesh-source-${this.uuid}`;
    }

    get fillerLayerId() {
        return `hexagon-mesh-fill-${this.uuid}`;
    }

    get outlineLayerId() {
        return `hexagon-mesh-outline-${this.uuid}`;
    }

    setGeoJSON(geoJson: HexagonGeoJSON) {
        this.geoJson = geoJson;
        if (this.source) {
            this.source.setData(geoJson);
        }
    }

    getCenterPoint(): [number, number] | null {
        if (!this.geoJson || this.geoJson.features.length === 0) {
            return null;
        }

        let sumX = 0;
        let sumY = 0;
        let count = 0;

        for (const feature of this.geoJson.features) {
            const coords = feature.geometry.coordinates;
            for (const polygon of coords) {
                for (const coord of polygon) {
                    sumX += coord[0];
                    sumY += coord[1];
                    count++;
                }
            }
        }

        if (count === 0) {
            return null;
        }

        return [sumX / count, sumY / count];
    }

    getCoordinatesOfIds(hexIds: number[], offset = lngLatOffsetToHexagonCenter): [number, number][] {
        return getCoordsFromHexagons(this.geoJson!, hexIds, offset);
    }

    setDemandKey(demandKey: string, showDemand: boolean = true) {
        this.demandKey = demandKey;

        if (!this.map) return;

        if (showDemand) {
            this.map.setPaintProperty(this.fillerLayerId, "fill-color", [
                "interpolate",
                ["linear"],
                ["get", demandKey],
                0, "rgba(51, 51, 51, 0.5)",
                1, "rgb(51, 51, 51)",
                200, "rgb(255, 51, 51)"
            ]);
        } else {
            this.map.setPaintProperty(this.fillerLayerId, "fill-color", "rgba(51, 51, 51, 0.5)");
        }
        this.map.setPaintProperty(this.fillerLayerId, "fill-opacity", [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.0,
            0.6
        ]);
    }

    drawOnMap(m: MaplibreMap) {
        this.map = m;

        if (!m.getSource(this.sourceId)) {
            m.addSource(this.sourceId, {
                type: "geojson",
                data: this.geoJson ?? { type: "FeatureCollection", features: [] },
                promoteId: "hex_id" // Use hex_id property as feature id
            });

            this.source = m.getSource(this.sourceId) as GeoJSONSource;

            m.addLayer({
                id: this.fillerLayerId,
                type: 'fill',
                source: this.sourceId,
                paint: {
                    'fill-color': '#888888',
                    'fill-opacity': 0.4,
                }
            });

            m.addLayer({
                id: this.outlineLayerId,
                type: 'line',
                source: this.sourceId,
                paint: {
                    'line-color': '#000000',
                    'line-width': 1,
                },
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClicked(callback: (hexId: number, properties?: any) => void) {
        if (!this.map) return;

        const mouseMoveListener = (e: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[]; }) => {
            if (e.features && e.features.length > 0 && this.demandKey) {
                const feature = e.features[0]!;
                const demand = feature.properties?.[this.demandKey] || 0;

                const hexId = feature.id as number;
                if (this.hoveredHexId !== hexId) {
                    // Remove hover from previous feature
                    if (this.hoveredHexId !== null) {
                        this.map!.removeFeatureState({ source: this.sourceId, id: this.hoveredHexId }, "hover");
                    }
                }
                if (demand > 0) {
                    this.map!.getCanvas().style.cursor = 'pointer';

                    // Set hover on new feature
                    this.hoveredHexId = hexId;
                    this.map!.setFeatureState(
                        { source: this.sourceId, id: hexId },
                        { hover: true }
                    );
                } else {
                    // Clear hover on current hexagon and reset this.hoveredHexId

                    if (this.hoveredHexId !== null) {
                        this.map!.getCanvas().style.cursor = "grab";
                        this.map!.removeFeatureState({ source: this.sourceId, id: this.hoveredHexId }, "hover");
                    }
                    this.hoveredHexId = null;
                }
            } else {
                // Clear hover if moving outside features
                if (this.hoveredHexId !== null) {
                    this.map!.removeFeatureState({ source: this.sourceId, id: this.hoveredHexId }, "hover");
                    this.hoveredHexId = null;
                    this.map!.getCanvas().style.cursor = "grab";
                }
            }
        }

        // Hover effect
        this.map.on('mousemove', this.fillerLayerId, mouseMoveListener);

        const mouseLeaveListener = () => {
            this.map!.getCanvas().style.cursor = '';

            if (this.hoveredHexId !== null) {
                this.map!.setFeatureState(
                    { source: this.sourceId, id: this.hoveredHexId },
                    { hover: false }
                );
                this.hoveredHexId = null;
            }
        }

        // Reset cursor when leaving layer
        this.map.on('mouseleave', this.fillerLayerId, mouseLeaveListener);
        const clickListener = (e: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[]; }) => {
            if (e.features && e.features.length > 0 && this.demandKey) {
                const feature = e.features[0]!;
                const demand = feature.properties?.[this.demandKey] || 0;

                if (demand > 0 && callback) {
                    const hexId = feature.properties?.hex_id;
                    if (hexId !== undefined) {
                        callback(hexId, feature.properties);
                    }
                }
            }
        }

        // Click handler
        this.map.on('click', this.fillerLayerId, clickListener);

        const cleanup = () => {
            this.map!.off('mousemove', this.fillerLayerId, mouseMoveListener);
            this.map!.off('mouseleave', this.fillerLayerId, mouseLeaveListener);
            this.map!.off('click', this.fillerLayerId, clickListener);
        };

        this.cleanup.push(cleanup);

        return cleanup;
    }

    removeFromMap() {
        if (!this.map) return;

        for (const clean of this.cleanup) {
            clean();
        }
        this.cleanup = [];

        if (this.map.getLayer(this.fillerLayerId)) {
            this.map.removeLayer(this.fillerLayerId);
        }
        if (this.map.getLayer(this.outlineLayerId)) {
            this.map.removeLayer(this.outlineLayerId);
        }
        if (this.map.getSource(this.sourceId)) {
            this.map.removeSource(this.sourceId);
        }
    }
}