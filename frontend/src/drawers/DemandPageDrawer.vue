<script setup lang="ts">
import { ref } from 'vue';
import { useSimulationsStore } from 'src/stores/simulation';
import { AsyncResult } from 'unwrapped/core';
import { useLazyGenerator } from 'unwrapped/vue';
import { useGameStateStore, GameStateLoader } from 'src/stores/gameState';
import DesignInspector from 'src/components/DesignInspector.vue';

const gameStateStore = useGameStateStore();
const simulationsStore = useSimulationsStore();

/* const gameAreasList = computed(() => Object.values(gameAreas));

function areaChanged(newId: GameAreaId) {
    designsStore.file = null;
    return gameStateStore.updateState({ areaId: newId });
} */

const { resultRef: simulationId, trigger: runSimulation } = useLazyGenerator(function* () {
    const state = yield* gameStateStore.gameState;
    
    if (!state.areaId) {
        return;
    }
    
    const simulationId = yield* AsyncResult.fromValuePromise(simulationsStore.runSimulation({
        area_id: state.areaId,
        // We only use these hardcoded hours
        input_params: {
            start_hour: 7,
            end_hour: 19
        },
        services: state.design ? {
            fixed_route_services: state.design.fixedRouteServices.map(service => service.toJSON()),
            on_demand_services: [...state.design.onDemandDockedServices, ...state.design.onDemandFreeFloatingServices].map(service => service.toJSON())
        } : undefined
    }));
    
    void gameStateStore.updateState({ simulationId: simulationId.run_id });
});

const pickedDesignFile = ref<File | null>(null);

const debounced = gameStateStore.gameState.toDebounced(100);
</script>

<template>
    <q-scroll-area class="fit">
        <GameStateLoader :result="debounced">
            <template #default="{ value: gameState }">
                <!-- <div class="q-pa-md">
                    <div class="text-h6 q-mb-md">Area</div>
                    <q-list>
                        <template v-for="area in gameAreasList" :key="area.id">
                            <q-item clickable :active="area.id === gameState.areaId" v-ripple @click="areaChanged(area.id)">
                                <q-item-section avatar>
                                    <q-icon name="send" />
                                </q-item-section>
                                <q-item-section>
                                    {{ area.name }}
                                </q-item-section>
                            </q-item>
                        </template>
                    </q-list>
                </div> -->
                
                <div class="q-pa-md q-mb-lg">
                    <div class="text-h6 q-mb-md row justify-between items-center">
                        <span>Demand</span>
                        <q-toggle :model-value="gameState.showDemand" @update:model-value="(e) => gameStateStore.updateState({ showDemand: e })" />
                    </div>
                    <div class="q-gutter-sm q-mb-md">
                        <q-radio
                            :model-value="gameState.mode"
                            @update:model-value="(e) => gameStateStore.updateState({ mode: e })"
                            dense
                            val="origin"
                            label="Origin"
                            :disable="!gameState.areaId"
                        />
                        <q-radio
                            :model-value="gameState.mode"
                            @update:model-value="(e) => gameStateStore.updateState({ mode: e })"
                            dense
                            val="destination"
                            label="Destination"
                            :disable="!gameState.areaId"
                        />
                    </div>
                    <div>
                        <div class="text-subtitle1">Hour of the day</div>
                        <q-slider
                            :model-value="gameState.hour"
                            @update:model-value="(e) => gameStateStore.setHour(e ?? 0)"
                            :min="0"
                            :max="23"
                            label
                            :markers="4"
                            marker-labels
                            :disable="!gameState.areaId"
                        />
                    </div>
                    <div>
                        <div class="demand-legend">
                            <div>0</div>
                            <div>>200</div>
                        </div>
                    </div>
                </div>
                
                <div class="q-pa-md">
                    <div class="text-h6 q-mb-md">Design</div>
                    <q-file v-model="pickedDesignFile" @update:model-value="gameStateStore.updateDesignFromFile" label="Set design" filled :disable="!gameState.areaId" />
                    <design-inspector v-if="gameState.design" :state="gameState" class="q-mt-md" />
                </div>
                    
                <div class="q-pa-md">
                    <div class="text-h6 q-mb-md">Simulation</div>
                    <q-btn
                        label="Run simulation"
                        color="primary" 
                        @click="runSimulation" 
                        :loading="simulationId.isLoading()" 
                        :disable="!gameState.areaId || !gameState.design || simulationId.isLoading()"
                    />
                </div>
            </template>
            <template #loading>
                <div class="row items-center justify-center q-pa-md q-pt-xl q-mt-xl">
                    <q-spinner color="primary" size="50px" />
                </div>
            </template>
        </GameStateLoader>
    </q-scroll-area>
</template>

<style scoped>

.demand-legend {
    display: flex;
    justify-content: space-between;
    padding: 0 8px;
    font-size: 12px;

    background: linear-gradient(to right, rgba(51, 51, 51, 0.6), rgba(255, 51, 51, 0.6));
}

</style>