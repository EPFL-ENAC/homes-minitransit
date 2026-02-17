import type { GameAreaMode } from 'src/stores/gameState';
import type { SimulationRoute } from 'src/stores/simulation';

export type SimulationRouteWithWaitingTime = SimulationRoute & {
    waiting_time_minutes: number;
};

export interface SimulationRouteGroup {
    from: number;
    to: number;
    routes: SimulationRouteWithWaitingTime[];
    statistics: SimulationRouteStatistics;
}

export interface SimulationRouteStatistics {
    totalTravelTimeMinutes: number;
    averageTravelTimeMinutes: number;
    minTravelTimeMinutes: number;
    maxTravelTimeMinutes: number;

    totalWaitingTimeMinutes: number;
    averageWaitingTimeMinutes: number;
    minWaitingTimeMinutes: number;
    maxWaitingTimeMinutes: number;

    totalFare: number;
    averageFare: number;
    minFare: number;
    maxFare: number;
}

export function computeUniquePaths(routes: SimulationRoute[], mode: GameAreaMode, fromHexId: number): SimulationRouteGroup[] {
    const record: Record<number, Omit<SimulationRouteGroup, "statistics">> = {};
    const otherOffset = mode === "origin" ? -1 : 0;
    const otherHex = mode === "origin" ? "end_hex" : "start_hex";

    for (const route of routes) {
        const lastAction = route.actions.at(otherOffset);
        if (!lastAction) {
            continue;
        }

        const otherHexId = lastAction[otherHex];

        const routeWithWaitingTime: SimulationRouteWithWaitingTime = {
            ...route,
            waiting_time_minutes: route.actions.filter(action => action.type === "Wait").reduce((sum, action) => sum + (action.duration_minutes || 0), 0)
        };

        if (!record[otherHexId]) {
            record[otherHexId] = {
                from: fromHexId,
                to: otherHexId,
                routes: [routeWithWaitingTime]
            };
        } else {
            record[otherHexId].routes.push(routeWithWaitingTime);
        }
    }

    const groups = Object.values(record).map(group => ({
        ...group,
        statistics: computeStatistics(group)
    }));

    return groups;
}

function computeStatistics(group: Omit<SimulationRouteGroup, "statistics">): SimulationRouteStatistics {
    let totalTravelTimeMinutes = 0;
    let totalWaitingTimeMinutes = 0;
    let totalFare = 0;
    let minTravelTimeMinutes = Infinity;
    let maxTravelTimeMinutes = -Infinity;
    let minWaitingTimeMinutes = Infinity;
    let maxWaitingTimeMinutes = -Infinity;
    let minFare = Infinity;
    let maxFare = -Infinity;

    for (const route of group.routes) {
        totalTravelTimeMinutes += route.time_taken_minutes;
        totalWaitingTimeMinutes += route.waiting_time_minutes;
        totalFare += route.total_fare;

        if (route.time_taken_minutes < minTravelTimeMinutes) {
            minTravelTimeMinutes = route.time_taken_minutes;
        }
        if (route.time_taken_minutes > maxTravelTimeMinutes) {
            maxTravelTimeMinutes = route.time_taken_minutes;
        }

        if (route.waiting_time_minutes < minWaitingTimeMinutes) {
            minWaitingTimeMinutes = route.waiting_time_minutes;
        }
        if (route.waiting_time_minutes > maxWaitingTimeMinutes) {
            maxWaitingTimeMinutes = route.waiting_time_minutes;
        }

        if (route.total_fare < minFare) {
            minFare = route.total_fare;
        }
        if (route.total_fare > maxFare) {
            maxFare = route.total_fare;
        }
    }

    const averageTravelTimeMinutes = group.routes.length > 0 ? totalTravelTimeMinutes / group.routes.length : 0;
    const averageWaitingTimeMinutes = group.routes.length > 0 ? totalWaitingTimeMinutes / group.routes.length : 0;
    const averageFare = group.routes.length > 0 ? totalFare / group.routes.length : 0;

    return {
        totalTravelTimeMinutes,
        averageTravelTimeMinutes,
        minTravelTimeMinutes,
        maxTravelTimeMinutes,
        totalWaitingTimeMinutes,
        averageWaitingTimeMinutes,
        minWaitingTimeMinutes,
        maxWaitingTimeMinutes,
        totalFare,
        averageFare,
        minFare,
        maxFare,
    };
}