<script setup lang="ts">
import { type GameAreaId, gameAreas } from 'app/utils/areasUtils';
import { demandPageQueryParamsDescription, useQueryParamsDescription } from 'src/router/routingUtils';
import { useDesignsStore } from 'src/stores/designs';
import { computed } from 'vue';
import { useSimulationsStore } from 'src/stores/simulation';
import { AsyncResult } from 'unwrapped/core';
import { useLazyGenerator } from 'unwrapped/vue';

const designsStore = useDesignsStore();
const simulationsStore = useSimulationsStore();

const { params: pageParams, updateParams } = useQueryParamsDescription(demandPageQueryParamsDescription);
const gameAreasList = computed(() => Object.values(gameAreas));

function areaChanged(newId: GameAreaId) {
    designsStore.file = null;
    return updateParams({ areaId: newId });
}

const { resultRef: simulationId, trigger: runSimulation } = useLazyGenerator(function* () {
    if (!pageParams.value.areaId) {
        return;
    }

    const simulationId = yield* AsyncResult.fromValuePromise(simulationsStore.runSimulation({
        area_id: pageParams.value.areaId,
        input_params: {
            hour: pageParams.value.hour,
        },
        services: designsStore.selectedDesign ? {
            fixed_route_services: designsStore.selectedDesign.fixedRouteServices.map(service => service.toJSON()),
            on_demand_services: [...designsStore.selectedDesign.onDemandDockedServices, ...designsStore.selectedDesign.onDemandFreeFloatingServices].map(service => service.toJSON())
        } : undefined
    }));

    void updateParams({ simulationId: simulationId.run_id });
});

</script>

<template>
    <q-scroll-area class="fit">
        <div class="q-pa-md">
            <div class="text-h6 q-mb-md">Area</div>
            <q-list>
                <template v-for="area in gameAreasList" :key="area.id">
                    <q-item clickable :active="area.id === pageParams.areaId" v-ripple @click="areaChanged(area.id)">
                        <q-item-section avatar>
                            <q-icon name="send" />
                        </q-item-section>
                        <q-item-section>
                            {{ area.name }}
                        </q-item-section>
                    </q-item>
                </template>
            </q-list>
        </div>

        <div class="q-pa-md q-mb-lg">
            <div class="text-h6 q-mb-md">Demand</div>
            <div class="q-gutter-sm q-mb-md">
                <q-radio
                    :model-value="pageParams.mode"
                    @update:model-value="(e) => updateParams({ mode: e })"
                    dense
                    val="origin"
                    label="Origin"
                    :disable="!pageParams.areaId"
                />
                <q-radio
                    :model-value="pageParams.mode"
                    @update:model-value="(e) => updateParams({ mode: e })"
                    dense
                    val="destination"
                    label="Destination"
                    :disable="!pageParams.areaId"
                />
            </div>
            <div>
                <div class="text-subtitle1">Hour of the day</div>
                <q-slider
                    :model-value="pageParams.hour"
                    @update:model-value="(e) => updateParams({ hour: e ?? 0 })"
                    :min="0"
                    :max="23"
                    label
                    :markers="4"
                    marker-labels
                    :disable="!pageParams.areaId"
                />
            </div>
        </div>

        <div class="q-pa-md">
            <div class="text-h6 q-mb-md">Transit system design</div>
            <q-file v-model="designsStore.file" label="Add a design" filled clearable :disable="!pageParams.areaId" />
        </div>

        <div class="q-pa-md">
            <div class="text-h6 q-mb-md">Simulation</div>
            <q-btn
                label="Run simulation"
                color="primary" 
                @click="runSimulation" 
                :loading="simulationId.isLoading()" 
                :disable="!pageParams.areaId || !designsStore.file || simulationId.isLoading()"
            />
        </div>
    </q-scroll-area>
</template>
