import { defineStore } from "pinia";
import { makeAsyncResultLoader, useReactiveGenerator } from "unwrapped/vue";
import { type LocationQuery, useRoute, useRouter } from "vue-router";
import { CompressedDecompressedPair, compressToURL, decompressFromURL } from "src/lib/utils/compression";
import { AsyncResult } from "unwrapped/core";
import { TransitSystemDesign } from "src/lib/designs/transitSystemDesign";
import type { TransitSystemDesignJSON } from "src/lib/designs/types";
import { makeSimulationRoutesGroupId, type SimulationRouteParams, useSimulationsStore } from "./simulation";
import { computeUniquePaths, type SimulationRouteGroup } from "src/lib/designs/routes/statistics";

export type GameAreaMode = "origin" | "destination";

export interface GameState {
    areaId: string;
    hour: number;
    showDemand: boolean;
    mode: GameAreaMode;
    design: TransitSystemDesign | null;
    shownServices: Set<string>;
    simulationId: string | null;
    pickedHexId: number | null;
    simulationRoutesGroups: SimulationRouteGroup[] | null;
    shownRoutes: Set<string>;
    pickedServiceName: string | null;
}

function getHour(hourString: string | undefined): number {
    const hour = parseInt(hourString ?? "0");
    if (isNaN(hour) || hour < 0 || hour > 23) {
        return 0;
    }
    return hour;
}

function gameStatePartsToSimulationRouteParams(mode: GameAreaMode, simulationId: string | null, hexId: number | null): SimulationRouteParams | null {
    if (!simulationId || hexId === null) {
        return null;
    }

    if (mode === "origin") {
        return {
            simulationParams: {
                simulationId: simulationId,
            },
            type: "out",
            startHexId: hexId
        }
    }
    
    return {
        simulationParams: {
            simulationId: simulationId,
        },
        type: "in",
        endHexId: hexId
    }
}

export const useGameStateStore = defineStore("gameState", () => {
    const route = useRoute();
    const router = useRouter();
    const simulationsStore = useSimulationsStore();

    const designPair = new CompressedDecompressedPair<TransitSystemDesign>(
        async (design) => {
            const json = design.toJSON();
            return compressToURL(json);
        },
        async (json) => {
            const intermediate = await decompressFromURL<TransitSystemDesignJSON>(json);
            return TransitSystemDesign.fromJSON(intermediate);
        }
    );

    const gameState = useReactiveGenerator<LocationQuery, GameState>(() => route.query, function* (query) {
        const mode = (query.mode ?? "origin") as GameAreaMode;
        const simulationId = query.simulationId as string || null;
        const pickedHexId = query.pickedHexId ? parseInt(query.pickedHexId as string) : null;
        const hour = getHour(query.hour as string | undefined);

        const design = yield* AsyncResult.fromValuePromise(designPair.decompressIfNeeded(query.designCompressed as string | null));

        let simulationRoutesGroups: SimulationRouteGroup[] | null = null;
        const simulationRoutesParams = gameStatePartsToSimulationRouteParams(mode, simulationId, pickedHexId);
        if (simulationRoutesParams) {
            const simulationRoutes = yield* simulationsStore.getSimulationRoute(simulationRoutesParams, hour);
            simulationRoutesGroups = computeUniquePaths(simulationRoutes, mode, pickedHexId ?? -1);
        } else if (simulationId) {
            yield* simulationsStore.getSimulationResult({
                simulationId
            }); // Wait for the simulation result to be loaded even if we don't show routes to show a loading state
        }

        return {
            areaId: "Lausanne", // Hardcode lausanne now as the project of having Renens was scrapped // query.areaId as string | undefined,
            showDemand: query.showDemand !== "false", // default to true if not specified
            hour,
            mode,
            design,
            shownServices: new Set(decodeURIComponent(query.shownServices as string).split(";")),
            simulationId,
            pickedHexId,
            simulationRoutesGroups,
            shownRoutes: new Set(decodeURIComponent(query.shownRoutes as string).split(";")),
            pickedServiceName: query.pickedServiceName ? (query.pickedServiceName as string) : null,
        } as GameState;
    });

    async function stateToQuery(state: GameState): Promise<LocationQuery> {
        const query: LocationQuery = {};
        for (const [key, value] of Object.entries(state)) {
            if (value === undefined || value === null) {
                continue;
            }

            if (key === "design") {
                const compressed = await designPair.compressIfNeeded(value);
                query.designCompressed = compressed;
            } else if (value instanceof Set) {
                query[key] = Array.from(value).join(";");
            } else if (key !== "simulationRoutesGroups") { // This is not needed in the URL as it's derived from other state parts
                query[key] = String(value);
            }
        }
        return query;
    }

    function updateStateInternal(newState: Partial<GameState>) {
        return AsyncResult.run(function* () {
            const currentState = yield* gameState.value;

            const updatedState: GameState = {
                ...currentState,
                ...newState,
            };
            const query = yield* AsyncResult.fromValuePromise(stateToQuery(updatedState));

            return yield* AsyncResult.fromValuePromise(router.push({ query }));
        });
    }

    function updateState(newState: Partial<Omit<GameState, "design" | "simulationRoutesGroups" | "pickedHexId">>) {
        return updateStateInternal(newState);
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
        const asString = fileReader.result as string;
        const design = TransitSystemDesign.fromJSON(JSON.parse(asString));
        updateStateInternal({
            design,
            shownServices: new Set(design.services.map((s) => s.name))
        });
    };

    function updateDesignFromFile(file: File | null) {
        if (!file) {
            return updateStateInternal({ design: null });
        }
        fileReader.abort();
        fileReader.readAsText(file);
    }

    function showService(serviceName: string, shown: boolean) {
        return AsyncResult.run(function* () {
            const state = yield* gameState.value;
            if (shown) {
                state.shownServices.add(serviceName);
            } else {
                state.shownServices.delete(serviceName);
            }
            return yield* updateState({ shownServices: state.shownServices });
        })
    }

    function pickHexagon(hexId: number | null) {
        return AsyncResult.run(function* () {
            const state = yield* gameState.value;

            let shownRoutesIds = new Set<string>();
            if (state.simulationId && hexId !== null) {
                const simulationRoutesParams = gameStatePartsToSimulationRouteParams(state.mode, state.simulationId, hexId);
                if (simulationRoutesParams) {
                    const routes = yield* simulationsStore.getSimulationRoute(simulationRoutesParams, state.hour);
                    const groups = computeUniquePaths(routes, state.mode, hexId);
                    shownRoutesIds = new Set(groups.map(makeSimulationRoutesGroupId));
                }
            }

            return yield* updateStateInternal({ pickedHexId: hexId, shownRoutes: shownRoutesIds });
        });
    }

    function setHour(hour: number) {
        return AsyncResult.run(function* () {
            const state = yield* gameState.value;

            // We need to recompute which routes are to be shown to re-activate all the routes groups
            let shownRoutesIds = new Set<string>();
            if (state.simulationId && state.pickedHexId !== null) {
                const simulationRoutesParams = gameStatePartsToSimulationRouteParams(state.mode, state.simulationId, state.pickedHexId);
                if (simulationRoutesParams) {
                    const routes = yield* simulationsStore.getSimulationRoute(simulationRoutesParams, hour);
                    const groups = computeUniquePaths(routes, state.mode, state.pickedHexId);
                    shownRoutesIds = new Set(groups.map(makeSimulationRoutesGroupId));
                }
            }

            return yield* updateStateInternal({ hour, shownRoutes: shownRoutesIds });
        });
    }

    function showRoute(routeId: string, shown: boolean) {
        return AsyncResult.run(function* () {
            const state = yield* gameState.value;
            if (shown) {
                state.shownRoutes.add(routeId);
            } else {
                state.shownRoutes.delete(routeId);
            }
            return yield* updateState({ shownRoutes: state.shownRoutes });
        })
    }

    function showAllRoutes(shown: boolean) {
        return AsyncResult.run(function* () {
            const state = yield* gameState.value;
            return yield* updateState({
                shownRoutes: new Set(shown && state.simulationRoutesGroups ? state.simulationRoutesGroups.map(makeSimulationRoutesGroupId) : [])
            });
        });
    }

    return {
        gameState,
        updateState,
        updateDesignFromFile,
        showService,
        pickHexagon,
        setHour,
        showRoute,
        showAllRoutes,
    }
});

export const GameStateLoader = makeAsyncResultLoader<GameState>({});
