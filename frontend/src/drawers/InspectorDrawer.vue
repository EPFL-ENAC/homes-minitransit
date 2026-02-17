<script setup lang="ts">
import { useGameAreasStore } from 'src/stores/gameAreasStore';
import { useSimulationsStore } from 'src/stores/simulation';
import { useAsyncResultRef } from 'unwrapped/vue';
import { computed, ref } from 'vue';
import ServiceInspector from 'src/components/ServiceInspector.vue';
import SimulationInspector from 'src/components/SimulationInspector.vue';
import HexInspector from 'src/components/HexInspector.vue';
import RoutesInspector from 'src/components/RoutesInspector.vue';
import { useGameStateStore, GameStateLoader } from 'src/stores/gameState';
import { AsyncResult } from 'unwrapped/core';

const gameStateStore = useGameStateStore();
const simulationsStore = useSimulationsStore();
const gameAreasStore = useGameAreasStore();

// eslint-disable-next-line require-yield
const serviceOptions = useAsyncResultRef(gameStateStore.gameState.derivedGenerator(function* (state) {
    return state.design?.services.map(service => ({
        label: service.name,
        value: service.name
    })) || [];
}));

// eslint-disable-next-line require-yield
const currentService = useAsyncResultRef(gameStateStore.gameState.derivedGenerator(function* (state) {
    if (!state.design || !state.pickedServiceName) {
        return null;
    }
    const found = state.design.services.find(line => line.name === state.pickedServiceName);
    return found || null;
}));
const servicePanelOpen = ref(false);

const currentSimulation = useAsyncResultRef(gameStateStore.gameState.derivedGenerator(function* (state) {
    if (!state.simulationId) {
        return null;
    }
    return yield* simulationsStore.getSimulationResult({ simulationId: state.simulationId });
}));

const simulationsOptions = computed(() => {
    return simulationsStore.allAvailableSimulations.map(sim => ({
        label: sim.simulationId.slice(0, 23) + '...' ,
        value: sim.simulationId
    }));
});
const simulationPanelOpen = ref(false);

const currentHex = useAsyncResultRef(gameStateStore.gameState.derivedGenerator(function* (state) {
    if (!state.pickedHexId || !state.areaId) {
        return null;
    }

    const area = yield* gameAreasStore.getGameAreaGeometry({ areaId: state.areaId, reprojectToWGS84: true });
    const hex = area.features.find(feature => feature.properties?.hex_id === state.pickedHexId);
    return hex;
}));

const currentRoutes = useAsyncResultRef(gameStateStore.gameState.derivedGenerator(function* (state) {
    if (!state.pickedHexId || !state.simulationId) {
        return null;
    }

    const routes = yield* simulationsStore.getSimulationRoute(
        state.mode === "origin" ? {
            simulationParams: {
                simulationId: state.simulationId,
            },
            type: "out",
            startHexId: state.pickedHexId,
        } : {
            simulationParams: {
                simulationId: state.simulationId,
            },
            type: "in",
            endHexId: state.pickedHexId,
        }
    );

    return routes;
}));

const routesPanelOpen = ref(false);


function downloadResults() {
    return AsyncResult.run(function* () {
        const simulation = yield* currentSimulation.value;
        const state = yield* gameStateStore.gameState;
    
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(simulation, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `simulation_results_${state.simulationId}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
}

const debounced = gameStateStore.gameState.toDebounced(100);

</script>

<template>
    <q-scroll-area class="fit">
        <div class="q-pa-md">
            <div class="text-h5 q-mb-md">Inspector</div>
        </div>

        <game-state-loader :result="debounced">
            <template #default="{ value: state }">
                <hex-inspector :current-hex="currentHex.unwrapOrNull()" :design="state.design" :hour="state.hour" />
        
                <q-expansion-item v-if="serviceOptions.unwrapOrNull()?.length" label="Services" header-class="text-h6" v-model="servicePanelOpen">
                    <div class="q-px-md q-pb-md">
                        <q-select
                            :model-value="state.pickedServiceName"
                            @update:model-value="(newValue) => gameStateStore.updateState({ pickedServiceName: newValue })"
                            emit-value
                            :options="serviceOptions.unwrapOrThrow()"
                            label="Selected service"
                            clearable
                        />
                        <q-markup-table v-if="currentService.unwrapOrNull()" flat class="q-mt-md">
                            <service-inspector :service="currentService.unwrapOrNull()!" />
                        </q-markup-table>
                    </div>
                </q-expansion-item>
        
                <q-expansion-item v-if="currentRoutes.unwrapOrNull()" label="Routes" header-class="text-h6" v-model="routesPanelOpen">
                    <div class="q-px-md q-pb-md">
                        <routes-inspector :routes="currentRoutes.unwrapOrNull()!" :hex-id="state.pickedHexId!" :mode="state.mode" :shown-routes="state.shownRoutes" />
                    </div>
                </q-expansion-item>

                <q-expansion-item v-if="currentSimulation.unwrapOrNull()" label="Simulation" header-class="text-h6" v-model="simulationPanelOpen">
                    <div class="q-px-md q-pb-md">
                        <q-select
                            :model-value="state.simulationId"
                            @update:model-value="(newValue) => gameStateStore.updateState({ simulationId: newValue })"
                            emit-value
                            :options="simulationsOptions"
                            label="Select simulation"
                            clearable
                            map-options
                        />
                        <q-btn class="q-mt-md" color="primary" label="Download simulation results" @click="downloadResults" />
                        
                        <div class="q-mt-md inspector-heading">Overview</div>
                        <q-markup-table flat class="q-mt-md">
                            <simulation-inspector :simulation="currentSimulation.unwrapOrNull()!" />
                        </q-markup-table>
                    </div>
                </q-expansion-item>
            </template>
        </game-state-loader>
    </q-scroll-area>
</template>