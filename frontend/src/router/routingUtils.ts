import type { GameAreaMode } from "src/stores/gameAreasStore";
import { computed } from "vue";
import { useRoute, useRouter, type LocationQuery } from "vue-router";

export type DemandPageUrlParams = {
    areaId: string | undefined;
    hour: number;
    mode: GameAreaMode;
    simulationId: string | null;
    pickedHexId: number | null;
    pickedServiceName?: string | null;
};

function getHour(hourString: string | undefined): number {
    const hour = parseInt(hourString ?? "0");
    if (isNaN(hour) || hour < 0 || hour > 23) {
        return 0;
    }
    return hour;
}

export function extractDemandPageUrlParams(query: LocationQuery): DemandPageUrlParams {
    return {
        areaId: query.areaId as string | undefined,
        hour: getHour(query.hour as string | undefined),
        mode: (query.mode ?? "origin") as GameAreaMode,
        simulationId: query.simulationId as string || null,
        pickedHexId: query.pickedHexId ? parseInt(query.pickedHexId as string) : null,
        pickedServiceName: query.pickedServiceName ? (query.pickedServiceName as string) : null
    };
}

function toLocationQuery(obj: Record<string, unknown>, skipUndefined: boolean = true, skipNull = false): LocationQuery {
    const query: LocationQuery = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined && skipUndefined) {
            continue;
        }
        if (value === null && skipNull) {
            continue;
        }
        query[key] = String(value);
    }
    return query;
}

export class QueryParamsDescription<T extends Record<string, unknown>> {
    constructor(
        public queryToParams: (query: LocationQuery) => T, // TODO : handle parsing errors
        public paramsToQuery: (params: T) => LocationQuery = (params: T) => toLocationQuery(params)
    ) { }
}

export function useQueryParamsDescription<T extends Record<string, unknown>>(description: QueryParamsDescription<T>) {
    const route = useRoute();
    const router = useRouter();

    const params = computed<T>(() => {
        const query = route.query;
        return description.queryToParams(query);
    });

    function updateParams(newParams: Partial<T>) {
        const p = params.value;
        return router.push({
            query: description.paramsToQuery({ ...p, ...newParams })
        });
    }

    return {
        params,
        updateParams
    };
}

export const demandPageQueryParamsDescription = new QueryParamsDescription<DemandPageUrlParams>(
    (query: LocationQuery) => {
        return extractDemandPageUrlParams(query);
    },
    (params: DemandPageUrlParams) => toLocationQuery(params, true, true)
);