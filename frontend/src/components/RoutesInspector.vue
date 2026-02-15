<script setup lang="ts">
import type { GameAreaMode } from 'src/stores/gameAreasStore';
import type { SimulationRoute } from 'src/stores/simulation';
import { computed } from 'vue';

const props = defineProps<{
    routes: SimulationRoute[];
    hexId: number;
    mode: GameAreaMode;
}>();

type SimulationRouteWithWaitingTime = SimulationRoute & {
    waiting_time_minutes: number;
};

interface SimulationRouteGroup {
    from: number;
    to: number;
    routes: SimulationRouteWithWaitingTime[];
    statistics: SimulationRouteStatistics;
}

interface SimulationRouteStatistics {
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

const uniquePaths = computed(() => {
    const record: Record<number, Omit<SimulationRouteGroup, "statistics">> = {};
    const otherOffset = props.mode === "origin" ? 0 : -1;
    const otherHex = props.mode === "origin" ? "end_hex" : "start_hex";

    for (const route of props.routes) {
        const lastAction = route.actions[otherOffset];
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
                from: props.hexId,
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
});

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

</script>

<template>
    <div v-for="routeGroup in uniquePaths" :key="`${routeGroup.from}-${routeGroup.to}`" class="q-mt-md">
        <div class="inspector-heading">{{ routeGroup.from }} → {{ routeGroup.to }}</div>
        <q-table
            :columns="[
                { name: 'measure', label: 'Measure', field: 'measure', align: 'left' },
                { name: 'average', label: 'Average', field: 'average', align: 'right' },
                { name: 'min', label: 'Min', field: 'min', align: 'right' },
                { name: 'max', label: 'Max', field: 'max', align: 'right' },
                { name: 'total', label: 'Total', field: 'total', align: 'right' },
            ]"
            :rows="[
                {
                    measure: 'Total demand',
                    average: '-',
                    min: '-',
                    max: '-',
                    total: routeGroup.routes.length,
                },
                {
                    measure: 'Travel time (minutes)',
                    average: routeGroup.statistics.averageTravelTimeMinutes.toFixed(2),
                    min: routeGroup.statistics.minTravelTimeMinutes.toFixed(2),
                    max: routeGroup.statistics.maxTravelTimeMinutes.toFixed(2),
                    total: routeGroup.statistics.totalTravelTimeMinutes,
                },
                {
                    measure: 'Waiting time (minutes)',
                    average: routeGroup.statistics.averageWaitingTimeMinutes.toFixed(2),
                    min: routeGroup.statistics.minWaitingTimeMinutes.toFixed(2),
                    max: routeGroup.statistics.maxWaitingTimeMinutes.toFixed(2),
                    total: routeGroup.statistics.totalWaitingTimeMinutes,
                },
                {
                    measure: 'Fare (CHF)',
                    average: routeGroup.statistics.averageFare.toFixed(2),
                    min: routeGroup.statistics.minFare.toFixed(2),
                    max: routeGroup.statistics.maxFare.toFixed(2),
                    total: routeGroup.statistics.totalFare,
                },
            ]"
            row-key="id"
            flat
            class="q-mt-md"
            hide-bottom
        />
    </div>
</template>