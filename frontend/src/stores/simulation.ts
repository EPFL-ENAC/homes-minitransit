import { defineStore } from "pinia";
import { AsyncResult, delay, KeyedAsyncCache } from "unwrapped/core";
import { fetchJSON } from "./utils";
import { computed, ref } from "vue";
import type { FixedRouteServiceJSON, OnDemandServiceJSON } from "src/lib/designs/types";
import { baseUrl } from "src/boot/api";
import type { SimulationRouteGroup } from "src/lib/designs/routes/statistics";

export type SimulationResultRetrieval = {
    status: "finished";
    result: SimulationResult;
} | {
    status: "pending";
} | {
    status: "not_found";
}

export interface SimulationResult {
    status: string;
    message: string;
    routes: SimulationRoute[];
    simulation_time: string;
    simulation_hour: number;
    demands_processed: number;
    input_demands_count: number;
    sampling_enabled: boolean;
    routes_generated: number;
    total_units: number;
    total_time_minutes: number;
    total_fare: number;
    average_fare: number;
    network_routes_taken: number;
}

export interface SimulationRoute {
    unit: number;
    time_taken_minutes: number;
    total_fare: number;
    actions: SimulationAction[];
}

export interface SimulationActionBase {
    start_time: string;
    end_time: string;
    duration_minutes: number;
    start_hex: number;
    end_hex: number;
}

export interface WalkAction extends SimulationActionBase {
    type: "Walk";
    walk_speed: number;
    distance: number;
    walk_path: number[]; // List of hex IDs representing the path taken while walking
}

export interface WaitAction extends SimulationActionBase {
    type: "Wait";
}

export interface RideAction extends SimulationActionBase {
    type: "Ride";
    service_name: string;
}

export type SimulationAction = WalkAction | WaitAction | RideAction;
export type SimulationActionType = SimulationAction["type"];

export interface SimulationParams {
    simulationId: string;
}

export type SimulationRouteParams = {
    simulationParams: SimulationParams;
} & ({
    type: "out",
    startHexId: number;
} | {
    type: "in",
    endHexId: number;
})

export type PostRunSimulationBody = {
    area_id: string;
    input_params: {
        hour: number;
    };
    services?: {
        fixed_route_services: FixedRouteServiceJSON[];
        on_demand_services: OnDemandServiceJSON[];
    } | undefined;
};

export interface PostRunSimulationResult {
    run_id: string;
}

export function makeSimulationRoutesGroupId(group: SimulationRouteGroup): string {
    return `${group.from}-${group.to}`;
}

export function watchForSimulationResult(params: SimulationParams, delayMS: number = 2000) {
    return AsyncResult.run(function* () {
        while (true) {
            const fetched = yield* AsyncResult.fromValuePromise(fetchJSON<SimulationResultRetrieval>(`${baseUrl}/simulation/simulate/${params.simulationId}`));
            const result = fetched.unwrapOrNull();
            if (!result) {
                return yield* AsyncResult.errTag("fetch_error", "Failed to fetch simulation result");
            }

            if (result.status === "not_found") {
                return yield* AsyncResult.errTag("not_found", "Simulation not found");
            } else if (result.status === "finished") {
                return result.result;
            }

            // Wait for some time before polling again
            yield* delay(delayMS);
        }
    });
}

export const useSimulationsStore = defineStore("simulations", () => {
    const simulationsList = ref<SimulationParams[]>([]);

    const simulationResultCache = new KeyedAsyncCache<SimulationParams, SimulationResult>(
        async (params: SimulationParams) => {
            const ar = watchForSimulationResult(params);
            const promise = ar.toResultPromise();

            promise.then(result => {
                if (result.isSuccess()) {
                    // Add to simulations list if not already present
                    const exists = simulationsList.value.some(sim => sim.simulationId === params.simulationId);
                    if (!exists) {
                        simulationsList.value.push(params);
                    }
                }
            }).catch(() => {}); // Ignore errors here as it's handled in the Result

            return promise;
        }
    );

    function getSimulationResult(params: SimulationParams) {
        return simulationResultCache.get(params);
    }

    function getSimulationRoute(params: SimulationRouteParams) {
        return AsyncResult.run(function* () {
            const simulationResult = yield* getSimulationResult(params.simulationParams);

            return simulationResult.routes.filter(route => {
                if (params.type === "out") {
                    return route.actions.at(0)?.start_hex === params.startHexId;
                } else {
                    return route.actions.at(-1)?.end_hex === params.endHexId;
                }
            });
        });
    }

    async function runSimulation(params: PostRunSimulationBody): Promise<PostRunSimulationResult> {
        const response = await fetch(`${baseUrl}/simulation/simulate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        return data as PostRunSimulationResult;
    }

    const allAvailableSimulations = computed(() => simulationsList.value);

    return {
        getSimulationResult,
        getSimulationRoute,
        runSimulation,
        allAvailableSimulations,
    };
});