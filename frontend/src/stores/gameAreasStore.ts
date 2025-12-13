import type { Geometry } from "geojson";
import { defineStore } from "pinia";
import proj4 from "proj4";
import { AsyncResult, KeyedAsyncCache, Result } from "unwrapped/core";
import Papa from "papaparse";
import { TransitSystemDesign } from "./designs";

export interface GameState {
    areaId: string;
    hour: number;
    mode: "origin" | "destination";
    design: TransitSystemDesign | null;
}

async function fetchJSON<T>(url: string): Promise<Result<T>> {
    const response = await fetch(url);
    if (!response.ok) {
        return Result.errTag(`fetch-failed`, response.statusText);
    }
    const json = await response.json();
    return Result.ok(json as T);
}

type HexagonGeoJSON = GeoJSON.FeatureCollection<Geometry & { coordinates: [number, number][][] }>;

interface GameAreaGeometryParams {
    areaId: string;
    reprojectToWGS84?: boolean; // TODO Reproject on the backend, once
}

interface GameAreaDemandParams {
    areaId: string;
}

async function fetchCSV(url: string): Promise<Result<GameAreaRawDemands[]>> {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true,
            header: true,
            complete: (results) => {
                resolve(Result.ok(results.data as GameAreaRawDemands[]));
            },
            error: (error) => {
                resolve(Result.errTag("parse-error", error.message));
            }
        });
    });
}

interface GameAreaRawDemands {
    departure_hour: string;
    start_hex_id: string;
    end_hex_id: string;
    demands: string;
}

export interface GameAreaDemandsItem {
    startHexId: string;
    endHexId: string;
    demands: number;
}

type GameAreaDemands = Map<number, GameAreaDemandsItem[]>;

function processDemands(rawDemands: GameAreaRawDemands[]): GameAreaDemands {
    const demandsMap: GameAreaDemands = new Map();

    for (const row of rawDemands) {
        const hour = parseInt(row.departure_hour, 10);
        const startHexId = row.start_hex_id;
        const endHexId = row.end_hex_id;
        const demands = parseInt(row.demands, 10);

        if (!demandsMap.has(hour)) {
            demandsMap.set(hour, []);
        }

        demandsMap.get(hour)!.push({
            startHexId,
            endHexId,
            demands,
        });
    }

    return demandsMap;
}

interface GameArea {
    geoJson: HexagonGeoJSON;
    demands: GameAreaDemands;
}

export const useGameAreasStore = defineStore("gameAreas", () => {
    const geoJsonCache = new KeyedAsyncCache<GameAreaGeometryParams, HexagonGeoJSON>(
        async (params: GameAreaGeometryParams) => {
            const r = await fetchJSON<HexagonGeoJSON>(`/game/areas/${params.areaId}.geojson`);
            const v = r.unwrapOrNull();
            if (!v) {
                return r;
            }

            if (params.reprojectToWGS84) {
                // Reproject from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
                v.features = v.features.map(feature => {
                    feature.geometry.coordinates = feature.geometry.coordinates.map(ring => {
                        return ring.map(coord => {
                            const [x, y] = proj4("EPSG:3857", "EPSG:4326", coord);
                            return [x, y];
                        });
                    });
                    return feature;
                });
            }

            // Sometimes the data is incomplete so we patch it

            const assertExist: string[] = [];
            for (let i = 0; i < 24; i++) {
                assertExist.push(`In_${i}`);
                assertExist.push(`Out_${i}`);
            }
            for (const f of v.features) {
                if (!f.properties) {
                    f.properties = {};
                }
                for (const key of assertExist) {
                    if (!f.properties[key]) {
                        f.properties[key] = 0;
                    }
                }
            }

            return Result.ok(v);
        }
    );

    const demandCache = new KeyedAsyncCache<GameAreaDemandParams, GameAreaDemands>(
        async (params: GameAreaDemandParams) => {
            const r = await fetchCSV(`/game/areas/${params.areaId}_demands.csv`);
            if (r.state.status === "error") {
                return Result.err(r.state.error);
            }
            return Result.ok(processDemands(r.unwrapOr([])));
        }
    );

    function getGameAreaGeometry(params: GameAreaGeometryParams) {
        return geoJsonCache.get(params);
    }

    function getGameAreaDemands(params: GameAreaDemandParams) {
        return demandCache.get(params);
    }

    function getGameArea(area: GameAreaGeometryParams) {
        return AsyncResult.run(function* () {
            const geoJson = yield* geoJsonCache.get(area); // TODO make run in parallel
            const demands = yield* demandCache.get(area);

            return {
                geoJson,
                demands,
            } as GameArea;
        });
    }

    return {
        getGameArea,
        getGameAreaGeometry,
        getGameAreaDemands
    };
});