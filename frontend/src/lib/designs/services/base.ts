import type { Map as MaplibreMap } from 'maplibre-gl';
import type { HexagonMesh } from '../hexagons/hexagonMesh';

export type DesignVisualState = "normal" | "hovered" | "selected";

export abstract class BaseDesignService<T> {
    protected eventListenersCleanUp: (() => void)[] = [];
    protected selected: boolean = false;
    protected visualState: DesignVisualState = "normal";
    protected map: MaplibreMap | null = null;

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
    drawOnMap(m: MaplibreMap, hexagons: HexagonMesh, color: string): void {
        this.removeFromMap();

        this.map = m;
    }

    setVisualState(state: DesignVisualState): void {
        this.visualState = state;
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        this.setVisualState(selected ? "selected" : "normal");
    }

    onClicked(m: MaplibreMap, callback: (service: BaseDesignService<T>) => void): () => void {
        let hoverCount = 0;
        let clicksRemaining = 0;

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

        const clickHandler = () => {
            if (clicksRemaining === 0) {
                clicksRemaining = hoverCount;
                callback(this);
            }
            clicksRemaining--;
        };

        this.layerIds.forEach((id) => {
            m.on("mouseenter", id, onEnter);
            m.on("mouseleave", id, onLeave);
            m.on("click", id, clickHandler);
        });

        const cleanUp = () => {
            this.layerIds.forEach((id) => {
                m.off("mouseenter", id, onEnter);
                m.off("mouseleave", id, onLeave);
                m.off("click", id, clickHandler);
            });
        };

        this.eventListenersCleanUp.push(cleanUp);
        return cleanUp;
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
}