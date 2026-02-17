import type { MapGeoJSONFeature, Map as MaplibreMap } from 'maplibre-gl';
import type { HexagonMesh } from '../hexagons/hexagonMesh';

export type DesignVisualState = "normal" | "hovered" | "selected";
// export type ClickPropagationResult = "handle" | "skip" | "propagate";

export abstract class BaseDesignService<T> {
    protected eventListenersCleanUp: (() => void)[] = [];
    protected selected: boolean = false;
    protected visualState: DesignVisualState = "normal";
    protected map: MaplibreMap | null = null;

    public hue: number = 0;

    constructor(
        public name: string,
        protected serviceData: T,
    ) { }

    toJSON(): T {
        return this.serviceData;
    }

    abstract get geojsonSourceId(): string;
    abstract get layerIds(): string[];

    toggleVisibility(visible: boolean): void {
        if (!this.map) return;
        
        const visibility = visible ? "visible" : "none";
        this.layerIds.forEach(layerId => {
            if (this.map!.getLayer(layerId)) {
                this.map!.setLayoutProperty(layerId, "visibility", visibility);
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    drawOnMap(m: MaplibreMap, hexagons: HexagonMesh, beforeLayerId?: string): () => void {
        this.removeFromMap();

        this.map = m;

        let hoverCount = 0;

        const updateHover = () => {
            const isHovered = hoverCount > 0;
            if (!this.selected) {
                this.setVisualState(isHovered ? "hovered" : "normal");
            }
            m.getCanvas().style.cursor = isHovered ? "pointer" : "grab";
        };

        const onEnter = () => {
            hoverCount++;
            updateHover();
        };
        const onLeave = () => {
            hoverCount = Math.max(0, hoverCount - 1);
            updateHover();
        };

        this.layerIds.forEach((id) => {
            m.on("mouseenter", id, onEnter);
            m.on("mouseleave", id, onLeave);
        });

        const cleanUp = () => {
            this.layerIds.forEach((id) => {
                m.off("mouseenter", id, onEnter);
                m.off("mouseleave", id, onLeave);
            });
        };

        this.eventListenersCleanUp.push(cleanUp);
        return cleanUp;
    }

    setVisualState(state: DesignVisualState): void {
        this.visualState = state;
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        this.setVisualState(selected ? "selected" : "normal");
    }

    removeFromMap() {
        if (!this.map) return;

        this.eventListenersCleanUp.forEach(cleanUp => cleanUp());
        this.eventListenersCleanUp = [];

        this.layerIds.forEach((id) => {
            if (this.map!.getLayer(id)) {
                this.map!.removeLayer(id);
            }
        });

        if (this.map.getSource(this.geojsonSourceId)) {
            this.map.removeSource(this.geojsonSourceId);
        }

        this.map = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    infoForHexagon(hexId: number): object | null {
        return null;
    }

    shouldCaptureClick(features: MapGeoJSONFeature[]): boolean {
        if (features && features.length > 0) {
            return features.some(f => this.layerIds.includes(f.layer.id));
        }
        return false;
    }
}