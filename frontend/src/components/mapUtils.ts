import type { Geometry } from 'geojson';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { FixedRouteService, TransitSystemDesign } from 'src/stores/designs';

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

export function getCoordsFromHexagons(geoJson: GeoJSON.FeatureCollection, hexIds: number[]): [number, number][] {
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
                coords.push(coord);
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

export function drawDesignToMap(m: Map, design: TransitSystemDesign, hexagonsSourceId: string) {
    for (const service of design.fixedRouteServices) {
        drawFixedRouteServiceToMap(m, service, makeFixedRouteServiceSourceId(service.name), hexagonsSourceId);
    }
}

export function cleanUpDesign(m: Map, design: TransitSystemDesign) {
    for (const service of design.fixedRouteServices) {
        m.removeLayer(makeServiceLineLayerId(service.name));
        m.removeLayer(makeServiceStopsLayerId(service.name));
        m.removeSource(makeFixedRouteServiceSourceId(service.name));
    }
}

export function drawFixedRouteServiceToMap(m: Map, service: FixedRouteService, sourceId: string, hexagonsSourceId: string) {
    const hexagonsSource = m.getSource<GeoJSONSource>(hexagonsSourceId);
    if (!hexagonsSource) {
        console.warn(`Hexagons source ${hexagonsSourceId} not found`);
        return;
    }

    const hexagonsData = hexagonsSource._data as GeoJSON.FeatureCollection;
    const coordsFromHexagons = getCoordsFromHexagons(hexagonsData, service.stops);

    const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {
            service_name: service.name,
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
        id: makeServiceLineLayerId(service.name),
        type: "line",
        source: sourceId,
        paint: {
            "line-color": "#FF0000",
            "line-width": 4,
        },
    });
    
    m.addLayer({
        id: makeServiceStopsLayerId(service.name),
        type: "circle",
        source: sourceId,
        paint: {
            "circle-radius": 6,
            "circle-color": "#FFFF00",
        }
    });
}