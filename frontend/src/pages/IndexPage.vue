<template>
  <q-page class="row items-center justify-evenly">
    <minitransit-map ref="map" v-model:game-state="params" @hexagon-clicked="navigateToHexagon" @service-clicked="navigateToService" />
  </q-page>
</template>

<script setup lang="ts">
import type { GameAreaId } from 'app/utils/areasUtils';
import MinitransitMap from 'components/MinitransitMap.vue';
import { demandPageQueryParamsDescription, useQueryParamsDescription } from 'src/router/routingUtils';
import { useDesignsStore } from 'src/stores/designs';
import type { GameState } from 'src/stores/gameAreasStore';
import { computed } from 'vue';

const designs = useDesignsStore();

const { params: urlParams, updateParams } = useQueryParamsDescription(demandPageQueryParamsDescription);

const params = computed<GameState>(() => {
  return {
    ...urlParams.value,
    areaId: urlParams.value.areaId as GameAreaId,
    design: designs.selectedDesign,
    pickedServiceName: urlParams.value.pickedServiceName || null,
  }
});

function navigateToHexagon(hexId: number/* , properties: Record<string, any> */) {
  return updateParams({ pickedHexId: hexId });
}

function navigateToService(serviceName: string) {
  return updateParams({ pickedServiceName: serviceName });
}
</script>
