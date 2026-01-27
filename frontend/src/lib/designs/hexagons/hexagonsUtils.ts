import type { Geometry } from 'geojson';

export const lngLatOffsetToHexagonCenter: [number, number] = [-0.0013, -0.00055];

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

export function getCoordsFromHexagons(geoJson: GeoJSON.FeatureCollection, hexIds: number[], offset: [number, number] = lngLatOffsetToHexagonCenter): [number, number][] {
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