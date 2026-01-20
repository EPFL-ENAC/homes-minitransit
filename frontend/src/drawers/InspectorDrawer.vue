<script setup lang="ts">
import { demandPageQueryParamsDescription, useQueryParamsDescription } from 'src/router/routingUtils';
import { useDesignsStore } from 'src/stores/designs';
import { useGameAreasStore } from 'src/stores/gameAreasStore';
import { useSimulationsStore } from 'src/stores/simulation';
import { AsyncResult } from 'unwrapped/core';
import { useReactiveChain, useReactiveGenerator } from 'unwrapped/vue';
import { computed, ref } from 'vue';

const designsStore = useDesignsStore();
const simulationsStore = useSimulationsStore();
const gameAreasStore = useGameAreasStore();

const { params: pageParams, updateParams } = useQueryParamsDescription(demandPageQueryParamsDescription);

const transitLinesOptions = computed(() => {
    return designsStore.selectedDesign?.fixedRouteServices.map(line => ({
        label: line.name,
        value: line.name
    })) || [];
});

const currentTransitLine = computed(() => {
    if (!designsStore.selectedDesign || !pageParams.value.pickedServiceName) {
        return null;
    }
    return designsStore.selectedDesign.fixedRouteServices.find(line => line.name === pageParams.value.pickedServiceName) || null;
});
const transitLinePanelOpen = ref(false);

const currentSimulation = useReactiveChain(() => pageParams.value.simulationId, (id) => {
    if (!id) {
        return AsyncResult.ok(null);
    }
    return simulationsStore.getSimulationResult({ simulationId: id });
});

const simulationsOptions = computed(() => {
    return simulationsStore.allAvailableSimulations.map(sim => ({
        label: sim.simulationId.slice(0, 23) + '...' ,
        value: sim.simulationId
    }));
});
const simulationPanelOpen = ref(false);

const currentHex = useReactiveGenerator(() => pageParams.value.pickedHexId, function* (hexId) {
    if (!hexId || !pageParams.value.areaId) {
        return null;
    }

    const area = yield* gameAreasStore.getGameAreaGeometry({ areaId: pageParams.value.areaId, reprojectToWGS84: true });
    const hex = area.features.find(feature => feature.properties?.hex_id === hexId);
    return hex;
});
const hexPanelOpen = ref(false);

</script>

<template>
    <q-scroll-area class="fit">
        <div class="q-pa-md">
            <div class="text-h5 q-mb-md">Inspector</div>
        </div>

        <q-expansion-item v-if="currentSimulation.unwrapOrNull()" label="Simulation" header-class="text-h6" v-model="simulationPanelOpen">
            <div class="q-px-md q-pb-md">
                <q-select
                    :model-value="pageParams.simulationId"
                    @update:model-value="(newValue) => updateParams({ simulationId: newValue })"
                    emit-value
                    :options="simulationsOptions"
                    label="Select simulation"
                    clearable
                    map-options
                />
                <q-markup-table flat class="q-mt-md">
                    <tbody>
                        <tr>
                            <td>Simulation duration</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.simulation_time }}</td>
                        </tr>
                        <tr>
                            <td>Simulation hour</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.simulation_hour }}</td>
                        </tr>
                        <tr>
                            <td>Demands processed</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.demands_processed }}</td>
                        </tr>
                        <tr>
                            <td>Sampling enabled</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.sampling_enabled ? 'Yes' : 'No' }}</td>
                        </tr>
                        <tr>
                            <td>Network routes taken</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.network_routes_taken }}</td>
                        </tr>
                        <tr>
                            <td>Routes generated</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.routes_generated }}</td>
                        </tr>
                        <tr>
                            <td>Input demands</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.input_demands_count }}</td>
                        </tr>
                        <tr>
                            <td>Total units</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.total_units }}</td>
                        </tr>
                        <tr>
                            <td>Total time (min)</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.total_time_minutes }}</td>
                        </tr>
                        <tr>
                            <td>Total fare</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.total_fare }}</td>
                        </tr>
                        <tr>
                            <td>Average fare</td>
                            <td class="text-right">{{ currentSimulation.unwrapOrNull()?.average_fare }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>
            </div>
        </q-expansion-item>

        <q-expansion-item v-if="currentHex.unwrapOrNull()" label="Tile" header-class="text-h6" v-model="hexPanelOpen">
            <div class="q-px-md q-pb-md">
                <!--<q-select
                    :model-value="pageParams.simulationId"
                    @update:model-value="(newValue) => updateParams({ simulationId: newValue })"
                    emit-value
                    :options="simulationsOptions"
                    label="Select simulation"
                    clearable
                    map-options
                />-->
                <div class="q-mt-md">Properties</div>
                <q-markup-table flat>
                    <tbody>
                        <tr>
                            <td>Hex ID</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.hex_id }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>

                <div class="q-mt-md">Origin demand</div>
                <q-markup-table flat>
                    <tbody>
                        <tr v-for="h in [...Array(24).keys()]" :key="h">
                            <td>{{ h }}</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.[`Out_${h}`] }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>

                <div>Destination demand</div>
                <q-markup-table flat class="q-mt-md">
                    <tbody>
                        <tr v-for="h in [...Array(24).keys()]" :key="h">
                            <td>{{ h }}</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.[`In_${h}`] }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>

                <div class="q-mt-md">Total demand</div>
                <q-markup-table flat>
                    <tbody>
                        <tr v-for="h in [...Array(24).keys()]" :key="h">
                            <td>{{ h }}</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.[`${h}`] }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>
            </div>
        </q-expansion-item>

        <q-expansion-item v-if="transitLinesOptions.length > 0" label="Transit Lines" header-class="text-h6" v-model="transitLinePanelOpen">
            <div class="q-px-md q-pb-md">
                <q-select
                    :model-value="pageParams.pickedServiceName"
                    @update:model-value="(newValue) => updateParams({ pickedServiceName: newValue })"
                    emit-value
                    :options="transitLinesOptions"
                    label="Selected transit line"
                    clearable
                />
                <q-markup-table v-if="currentTransitLine" flat class="q-mt-md">
                    <tbody>
                        <tr>
                            <td>Capacity</td>
                            <td class="text-right">{{ currentTransitLine.capacity }}</td>
                        </tr>
                        <tr>
                            <td>Number of stops</td>
                            <td class="text-right">{{ currentTransitLine.stops.length }}</td>
                        </tr>
                        <tr>
                            <td>Frequency</td>
                            <td class="text-right">{{ currentTransitLine.frequency }}</td>
                        </tr>
                        <tr>
                            <td>Stopping time</td>
                            <td class="text-right">{{ currentTransitLine.stopping_time }}</td>
                        </tr>
                        <tr>
                            <td>Travel time</td>
                            <td class="text-right">{{ currentTransitLine.travel_time }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>
            </div>
        </q-expansion-item>
    </q-scroll-area>
</template>