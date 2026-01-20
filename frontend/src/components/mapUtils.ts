import type { Geometry } from 'geojson';
import type { GeoJSONSource, Map, MapGeoJSONFeature } from 'maplibre-gl';
import type { FixedRouteService, TransitSystemDesign } from 'src/stores/designs';
import type { SimulationRoute } from 'src/stores/simulation';

const lngLatOffsetToHexagonCenter: [number, number] = [-0.0013, -0.00055];

export function addOrUpdateGeoJsonSourceToMap(m: Map, geoJson: GeoJSON.FeatureCollection, sourceName: string) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const source = m.getSource(sourceName) as GeoJSONSource | undefined;
    if (source) {
        source.setData(geoJson);
        return;
    }

    m.addSource(sourceName, {
        type: "geojson",
        data: geoJson,
        promoteId: "hex_id" // Use hex_id property as feature id
    });

    // Add a **fill layer** to visualize polygons
    m.addLayer({
        id: 'data-fill',
        type: 'fill',
        source: sourceName,
        paint: {} // To be modified by the caller
    });

    // Add a **line layer** to outline
    m.addLayer({
        id: 'data-outline',
        type: 'line',
        source: sourceName,
        paint: {
            'line-color': '#000',
            'line-width': 2,
        },
    });
}

export function getCoordsFromFeature(feature: GeoJSON.Feature<Geometry>): [number, number] | null {
    if (feature.geometry.type === "Point" && feature.geometry.coordinates.length === 2) {
        return feature.geometry.coordinates as [number, number];
    }
    if (feature.geometry.type === "MultiPoint" && feature.geometry.coordinates.length > 0) {
        return feature.geometry.coordinates[0] as [number, number];
    }
    if (feature.geometry.type === "LineString" && feature.geometry.coordinates.length > 0) {
        return feature.geometry.coordinates[0] as [number, number];
    }
    if (feature.geometry.type === "MultiLineString" && feature.geometry.coordinates.length > 0 && feature.geometry.coordinates[0] && feature.geometry.coordinates[0]?.length > 0) {
        return feature.geometry.coordinates[0][0] as [number, number];
    }
    if (feature.geometry.type === "Polygon" && feature.geometry.coordinates.length > 0 && feature.geometry.coordinates[0] && feature.geometry.coordinates[0].length > 0) {
        return feature.geometry.coordinates[0][0] as [number, number];
    }
    if (feature.geometry.type === "MultiPolygon" && feature.geometry.coordinates.length > 0 && feature.geometry.coordinates[0] && feature.geometry.coordinates[0].length > 0 && feature.geometry.coordinates[0][0] && feature.geometry.coordinates[0][0].length > 0) {
        return feature.geometry.coordinates[0][0][0] as [number, number];
    }
    return null;
}

export function getCenterPointOfGeoJSON(geoJson: GeoJSON.FeatureCollection): [number, number] {
    let sumLat = 0;
    let sumLng = 0;
    for (const feature of geoJson.features) {
        const coords = getCoordsFromFeature(feature);
        if (coords) {
            sumLng += coords[0];
            sumLat += coords[1];
        }
    }
    sumLat /= geoJson.features.length;
    sumLng /= geoJson.features.length;

    return [sumLng, sumLat];
}

export function getCoordsFromHexagons(geoJson: GeoJSON.FeatureCollection, hexIds: number[], offset: [number, number] = [0, 0]): [number, number][] {
    const hexIdToFeatureMap: { [key: number]: GeoJSON.Feature<Geometry> } = {};
    const coords: [number, number][] = [];

    for (const feature of geoJson.features) {
        if (feature.properties && feature.properties["hex_id"]) {
            hexIdToFeatureMap[feature.properties["hex_id"]] = feature;
        }
    }

    for (const hexId of hexIds) {
        const feature = hexIdToFeatureMap[hexId];
        if (feature) {
            const coord = getCoordsFromFeature(feature);
            if (coord) {
                coords.push([coord[0] + offset[0], coord[1] + offset[1]]);
            }
        }
    }

    return coords;
}

export function makeFixedRouteServiceSourceId(serviceName: string): string {
    return `fixed_route_service_${serviceName}_source`;
}

export function makeServiceLineLayerId(serviceName: string): string {
    return `service-${serviceName}-line`;
}

export function makeServiceStopsLayerId(serviceName: string): string {
    return `service-${serviceName}-stops`;
}

export function drawDesignToMap(m: Map, design: TransitSystemDesign, hexagonsSourceId: string, onServiceClicked?: (service: FixedRouteService) => void, currentlySelectedServiceName?: string) {
    const designColors = ["#FF0000", "#0000FF", "#00FF00", "#FFA500", "#800080", "#00FFFF", "#FFC0CB", "#808000"];
    const toCleanUp: (() => void)[] = [];

    for (let i = 0; i < design.fixedRouteServices.length; i++) {
        const service = design.fixedRouteServices[i]!;
        const color = designColors[i % designColors.length];
        toCleanUp.push(drawFixedRouteServiceToMap(m, service, makeFixedRouteServiceSourceId(service.name), hexagonsSourceId, color, onServiceClicked, currentlySelectedServiceName === service.name));
    }

    return () => {
        for (const cleanUp of toCleanUp) {
            cleanUp();
        }

        for (const service of design.fixedRouteServices) {
            m.removeLayer(makeServiceLineLayerId(service.name));
            m.removeLayer(makeServiceStopsLayerId(service.name));
            m.removeSource(makeFixedRouteServiceSourceId(service.name));
        }
    }
}

export function drawFixedRouteServiceToMap(m: Map, service: FixedRouteService, sourceId: string, hexagonsSourceId: string, color: string = "#FF0000", onClicked?: (service: FixedRouteService) => void, isSelected: boolean = false) {
    const hexagonsSource = m.getSource<GeoJSONSource>(hexagonsSourceId);
    if (!hexagonsSource) {
        console.warn(`Hexagons source ${hexagonsSourceId} not found`);
        return () => { };
    }

    const hexagonsData = hexagonsSource._data.geojson as unknown as GeoJSON.FeatureCollection;
    const coordsFromHexagons = getCoordsFromHexagons(hexagonsData, service.stops, lngLatOffsetToHexagonCenter);

    const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {
            service_name: service.name,
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

    const lineLayerId = makeServiceLineLayerId(service.name);
    const stopsLayerId = makeServiceStopsLayerId(service.name);

    m.addSource(sourceId, {
        type: "geojson",
        data: routeGeoJson,
    });

    m.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
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
            "line-dasharray": [1.5, 1],
        },
    });

    m.addLayer({
        id: stopsLayerId,
        type: "circle",
        source: sourceId,
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

    if (isSelected) {
        console.log("Service is selected:", service.name);
        m.setPaintProperty(lineLayerId, "line-opacity", 1);
        m.setPaintProperty(lineLayerId, "line-dasharray", [1, 0]);
        m.setPaintProperty(stopsLayerId, "circle-opacity", 1);

        return () => { };
    }


    let hoverCount = 0;
    let clicksRemaining = 0;

    // Hover effect for entire service (line and stops)
    const updateHover = () => {
        const hover = hoverCount > 0;
        m.setPaintProperty(lineLayerId, "line-opacity", hover ? 1 : 0.6);
        m.setPaintProperty(stopsLayerId, "circle-opacity", hover ? 1 : 0.6);
        m.getCanvas().style.cursor = hover ? "pointer" : "grab";
    };

    const onEnter = () => {
        hoverCount += 1;
        updateHover();
    };
    const onLeave = () => {
        hoverCount = Math.max(0, hoverCount - 1);
        updateHover();
    }

    m.on("mouseenter", lineLayerId, onEnter);
    m.on("mouseleave", lineLayerId, onLeave);
    m.on("mouseenter", stopsLayerId, onEnter);
    m.on("mouseleave", stopsLayerId, onLeave);

    const clickHandler = () => {
        // Shitty hack to prevent onClicked from firing twice when clicking on stops (which are on top of the line)
        if (clicksRemaining === 0) {
            clicksRemaining = hoverCount;
            onClicked?.(service);
        }
        clicksRemaining -= 1;
    }

    m.on("click", lineLayerId, clickHandler);
    m.on("click", stopsLayerId, clickHandler);

    updateHover();

    return () => {
        m.off("mouseenter", lineLayerId, onEnter);
        m.off("mouseleave", lineLayerId, onLeave);
        m.off("mouseenter", stopsLayerId, onEnter);
        m.off("mouseleave", stopsLayerId, onLeave);
        m.off("click", lineLayerId, clickHandler);
        m.off("click", stopsLayerId, clickHandler);
    }
}

export function setupHexagonInteractivity(m: Map, sourceName: string, demandKey: string, onHexagonClick?: (hexId: number, properties: Record<string, unknown>) => void) {
    const fillLayerId = 'data-fill';

    let hoveredHexId: string | null = null;

    function mouseMoveListener(e: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[]; }) {
        if (e.features && e.features.length > 0) {
            const feature = e.features[0]!;
            const demand = feature.properties?.[demandKey] || 0;

            const hexId = feature.id as string;
            if (hoveredHexId !== hexId) {
                // Remove hover from previous feature
                if (hoveredHexId !== null) {
                    m.removeFeatureState({ source: sourceName, id: hoveredHexId }, "hover");
                }
            }
            if (demand > 0) {
                m.getCanvas().style.cursor = 'pointer';

                // Set hover on new feature
                hoveredHexId = hexId;
                m.setFeatureState(
                    { source: sourceName, id: hexId },
                    { hover: true }
                );
            } else {
                // Clear hover on current hexagon and reset hoveredHexId

                if (hoveredHexId !== null) {
                    m.getCanvas().style.cursor = "grab";
                    m.removeFeatureState({ source: sourceName, id: hoveredHexId }, "hover");
                }
                hoveredHexId = null;
            }
        } else {
            // Clear hover if moving outside features
            if (hoveredHexId !== null) {
                m.removeFeatureState({ source: sourceName, id: hoveredHexId }, "hover");
                hoveredHexId = null;
                m.getCanvas().style.cursor = "grab";
            }
        }
    }

    // Hover effect
    m.on('mousemove', fillLayerId, mouseMoveListener);

    function mouseLeaveListener() {
        m.getCanvas().style.cursor = '';

        if (hoveredHexId !== null) {
            m.setFeatureState(
                { source: sourceName, id: hoveredHexId },
                { hover: false }
            );
            hoveredHexId = null;
        }
    }

    // Reset cursor when leaving layer
    m.on('mouseleave', fillLayerId, mouseLeaveListener);

    function clickListener(e: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[]; }) {
        if (e.features && e.features.length > 0) {
            const feature = e.features[0]!;
            const demand = feature.properties?.[demandKey] || 0;

            if (demand > 0 && onHexagonClick) {
                const hexId = feature.properties?.hex_id;
                if (hexId !== undefined) {
                    onHexagonClick(hexId, feature.properties);
                }
            }
        }
    }

    // Click handler
    m.on('click', fillLayerId, clickListener);

    return () => {
        m.off('mousemove', fillLayerId, mouseMoveListener);
        m.off('mouseleave', fillLayerId, mouseLeaveListener);
        m.off('click', fillLayerId, clickListener);
    }
}

export function getRouteActionsLines(route: SimulationRoute, hexagonsData: GeoJSON.FeatureCollection): GeoJSON.Feature<GeoJSON.LineString>[] {
    const routeLines: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    for (const action of route.actions) {
        const coords = getCoordsFromHexagons(hexagonsData, [action.start_hex, action.end_hex], lngLatOffsetToHexagonCenter);
        if (coords.length === 2) {
            const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
                type: "Feature",
                properties: {
                    actionType: action.type,
                },
                geometry: {
                    type: "LineString",
                    coordinates: coords,
                },
            };

            routeLines.push(lineString);
        }
    }

    return routeLines;
}

export function drawRoutesOnMap(m: Map, route: SimulationRoute[], hexagonsSourceId: string, sourceId: string) {
    const hexagonsSource = m.getSource<GeoJSONSource>(hexagonsSourceId);
    if (!hexagonsSource) {
        console.warn(`Hexagons source ${hexagonsSourceId} not found`);
        return;
    }

    const hexagonsData = hexagonsSource._data.geojson as unknown as GeoJSON.FeatureCollection;

    const routeGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };
    for (const singleRoute of route) {
        const routeLines = getRouteActionsLines(singleRoute, hexagonsData);
        routeGeoJson.features.push(...routeLines);
    }

    const source = m.getSource<GeoJSONSource>(sourceId);
    if (source) {
        source.setData(routeGeoJson);
        return;
    }

    m.addSource(sourceId, {
        type: "geojson",
        data: routeGeoJson,
    });

    m.addLayer({
        id: `${sourceId}-lines`,
        type: "line",
        source: sourceId,
        paint: {
            "line-color": [
                "match",
                ["get", "actionType"],
                "Ride", "#FF00FF",      // Magenta for Ride
                "Walk", "#00FF00",      // Green for Walk
                "#CCCCCC",              // Default color (Gray)
            ],
            "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5, 1,
                10, 2,
                14, 6,
                18, 32
            ],
        },
    });
}