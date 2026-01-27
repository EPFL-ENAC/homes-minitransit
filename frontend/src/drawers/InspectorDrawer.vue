<script setup lang="ts">
import { demandPageQueryParamsDescription, useQueryParamsDescription } from 'src/router/routingUtils';
import { useDesignsStore } from 'src/stores/designs';
import { useGameAreasStore } from 'src/stores/gameAreasStore';
import { useSimulationsStore } from 'src/stores/simulation';
import { AsyncResult } from 'unwrapped/core';
import { useReactiveChain, useReactiveGenerator } from 'unwrapped/vue';
import { computed, ref } from 'vue';
import ServiceInspector from 'src/components/ServiceInspector.vue';
import SimulationInspector from 'src/components/SimulationInspector.vue';
import RoutesInspector from 'src/components/RoutesInspector.vue';
import type { DesignService } from 'src/lib/designs/services';

const designsStore = useDesignsStore();
const simulationsStore = useSimulationsStore();
const gameAreasStore = useGameAreasStore();

const { params: pageParams, updateParams } = useQueryParamsDescription(demandPageQueryParamsDescription);

const serviceOptions = computed(() => {
    return designsStore.selectedDesign?.services.map(service => ({
        label: service.name,
        value: service.name
    })) || [];
});

const currentService = computed<DesignService | null>(() => {
    if (!designsStore.selectedDesign || !pageParams.value.pickedServiceName) {
        return null;
    }
    const found = designsStore.selectedDesign.services.find(line => line.name === pageParams.value.pickedServiceName);
    return (found || null) as DesignService | null;
});
const servicePanelOpen = ref(false);

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

const currentRoutes = useReactiveGenerator(() => pageParams.value.pickedHexId, function* (hexId) {
    if (!hexId || !pageParams.value.simulationId) {
        return null;
    }

    const routes = yield* simulationsStore.getSimulationRoute(
        pageParams.value.mode === "origin" ? {
            simulationParams: {
                simulationId: pageParams.value.simulationId,
            },
            type: "out",
            startHexId: hexId,
        } : {
            simulationParams: {
                simulationId: pageParams.value.simulationId,
            },
            type: "in",
            endHexId: hexId,
        }
    );

    return routes;
});
const routesPanelOpen = ref(false);


function downloadResults() {
    const simulation = currentSimulation.value.unwrapOrNull();
    if (!simulation) {
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(simulation, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `simulation_results_${pageParams.value.simulationId}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

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
                <q-btn class="q-mt-md" color="primary" label="Download simulation results" @click="downloadResults" />
                <q-markup-table flat class="q-mt-md">
                    <simulation-inspector :simulation="currentSimulation.unwrapOrNull()!" />
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
                <div class="q-mt-md heading">Properties</div>
                <q-markup-table flat>
                    <tbody>
                        <tr>
                            <td>Hex ID</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.hex_id }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>

                <div class="q-mt-md heading">Origin demand</div>
                <q-markup-table flat>
                    <tbody>
                        <tr v-for="h in [...Array(24).keys()]" :key="h">
                            <td>{{ h }}</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.[`Out_${h}`] }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>

                <div class="q-mt-md heading">Destination demand</div>
                <q-markup-table flat>
                    <tbody>
                        <tr v-for="h in [...Array(24).keys()]" :key="h">
                            <td>{{ h }}</td>
                            <td class="text-right">{{ currentHex.unwrapOrNull()?.properties?.[`In_${h}`] }}</td>
                        </tr>
                    </tbody>
                </q-markup-table>

                <div class="q-mt-md heading">Total demand</div>
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

        <q-expansion-item v-if="serviceOptions.length > 0" label="Services" header-class="text-h6" v-model="servicePanelOpen">
            <div class="q-px-md q-pb-md">
                <q-select
                    :model-value="pageParams.pickedServiceName"
                    @update:model-value="(newValue) => updateParams({ pickedServiceName: newValue })"
                    emit-value
                    :options="serviceOptions"
                    label="Selected service"
                    clearable
                />
                <q-markup-table v-if="currentService" flat class="q-mt-md">
                    <service-inspector :service="currentService" />
                </q-markup-table>
            </div>
        </q-expansion-item>

        <q-expansion-item v-if="currentRoutes.unwrapOrNull()" label="Routes" header-class="text-h6" v-model="routesPanelOpen">
            <div class="q-px-md q-pb-md">
                <routes-inspector :routes="currentRoutes.unwrapOrNull()!" :hex-id="pageParams.pickedHexId!" :mode="pageParams.mode" />
            </div>
        </q-expansion-item>
    </q-scroll-area>
</template>

<style scoped>

    .heading {
        font-weight: 500;
        font-size: 1.1em;
    }

</style>