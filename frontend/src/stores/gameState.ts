import { defineStore } from "pinia";
import { makeAsyncResultLoader, useReactiveGenerator } from "unwrapped/vue";
import { type LocationQuery, useRoute, useRouter } from "vue-router";
import type { GameAreaMode, GameState } from "./gameAreasStore";
import { CompressedDecompressedPair, compressToURL, decompressFromURL } from "src/lib/utils/compression";
import { AsyncResult } from "unwrapped/core";
import { TransitSystemDesign } from "src/lib/designs/transitSystemDesign";
import type { TransitSystemDesignJSON } from "src/lib/designs/types";

function getHour(hourString: string | undefined): number {
    const hour = parseInt(hourString ?? "0");
    if (isNaN(hour) || hour < 0 || hour > 23) {
        return 0;
    }
    return hour;
}

export const useGameStateStore = defineStore("gameState", () => {
    const route = useRoute();
    const router = useRouter();

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
        const design = yield* AsyncResult.fromValuePromise(designPair.decompressIfNeeded(query.designCompressed as string | null));
        let shownServices = design?.services.map((s) => s.name);
        if (query.shownServices) {
            shownServices = decodeURIComponent(query.shownServices as string).split(";");
        }

        return {
            areaId: "Lausanne", // Hardcode lausanne now as the project of having Renens was scrapped // query.areaId as string | undefined,
            showDemand: query.showDemand !== "false", // default to true if not specified
            hour: getHour(query.hour as string | undefined),
            mode: (query.mode ?? "origin") as GameAreaMode,
            design,
            shownServices: new Set(shownServices),
            simulationId: query.simulationId as string || null,
            pickedHexId: query.pickedHexId ? parseInt(query.pickedHexId as string) : null,
            pickedServiceName: query.pickedServiceName ? (query.pickedServiceName as string) : null
        } as GameState;
    });

    async function stateToQuery(state: GameState): Promise<LocationQuery> {
        const query: LocationQuery = {};
        for (const [key, value] of Object.entries(state)) {
            if (value === undefined) {
                continue;
            }
            if (value === null) {
                continue;
            }

            if (key === "design") {
                const compressed = await designPair.compressIfNeeded(value);
                query.designCompressed = compressed;
            } else if (value instanceof Set) {
                query[key] = Array.from(value).join(";");
            } else {
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

    function updateState(newState: Partial<Omit<GameState, "design">>) {
        return updateStateInternal(newState);
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
        const asString = fileReader.result as string;
        const design = TransitSystemDesign.fromJSON(JSON.parse(asString));
        updateStateInternal({ design });
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

    return {
        gameState,
        updateState,
        updateDesignFromFile,
        showService
    }
});

export const GameStateLoader = makeAsyncResultLoader<GameState>({});
