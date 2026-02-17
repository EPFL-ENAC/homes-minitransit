<script setup lang="ts">
import { computeUniquePaths } from 'src/lib/designs/routes/statistics';
import { useGameStateStore, type GameAreaMode } from 'src/stores/gameState';
import type { SimulationRoute } from 'src/stores/simulation';
import { computed } from 'vue';

const gameState = useGameStateStore();

const props = defineProps<{
    routes: SimulationRoute[];
    hexId: number;
    mode: GameAreaMode;
    shownRoutes: Set<string>;
}>();

const uniquePaths = computed(() => computeUniquePaths(props.routes, props.mode, props.hexId));

</script>

<template>
    <div>
        <div class="toolbar">
            <q-btn color="primary" @click="() => gameState.showAllRoutes(true)">Show all routes</q-btn>
            <q-btn color="primary" outline @click="() => gameState.showAllRoutes(false)">Hide all routes</q-btn>
        </div>

        <div v-for="routeGroup in uniquePaths" :key="`${routeGroup.from}-${routeGroup.to}`" class="q-mt-md">
            <div class="inspector-heading">
                <q-toggle
                    :model-value="props.shownRoutes.has(`${routeGroup.from}-${routeGroup.to}`)"
                    @update:model-value="(e) => gameState.showRoute(`${routeGroup.from}-${routeGroup.to}`, e)"
                />
                <span>{{ routeGroup.from }} → {{ routeGroup.to }}</span>
            </div>
            <q-table
                v-if="props.shownRoutes.has(`${routeGroup.from}-${routeGroup.to}`)"
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
                        total: routeGroup.statistics.totalTravelTimeMinutes.toFixed(2),
                    },
                    {
                        measure: 'Waiting time (minutes)',
                        average: routeGroup.statistics.averageWaitingTimeMinutes.toFixed(2),
                        min: routeGroup.statistics.minWaitingTimeMinutes.toFixed(2),
                        max: routeGroup.statistics.maxWaitingTimeMinutes.toFixed(2),
                        total: routeGroup.statistics.totalWaitingTimeMinutes.toFixed(2),
                    },
                    {
                        measure: 'Fare (CHF)',
                        average: routeGroup.statistics.averageFare.toFixed(2),
                        min: routeGroup.statistics.minFare.toFixed(2),
                        max: routeGroup.statistics.maxFare.toFixed(2),
                        total: routeGroup.statistics.totalFare.toFixed(2),
                    },
                ]"
                row-key="id"
                flat
                hide-bottom
            />
        </div>
    </div>
</template>

<style scoped>

.toolbar {
    display: flex;
    gap: 1rem;
}

</style>