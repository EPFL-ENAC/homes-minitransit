<template>
  <q-page class="row items-center justify-evenly">
    <minitransit-map ref="map" v-model:game-state="params" />
  </q-page>
</template>

<script setup lang="ts">
import type { GameAreaId } from 'app/utils/areasUtils';
import MinitransitMap from 'components/MinitransitMap.vue';
import { useDesignsStore } from 'src/stores/designs';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const designs = useDesignsStore();

const service = {
  "services": [
    {
      "name": "Bus 1",
      "stops": [944, 897, 849, 695, 477, 199, 73, 16],
      "frequency": 5,
      "capacity": 80,
      "stopping_time": 0,
      "travel_time": 1
    },
    {
      "name": "Metro Line 1",
      "stops": [522, 573, 569, 621, 616, 611, 551, 1068],
      "frequency": 3,
      "capacity": 100,
      "stopping_time": 0,
      "travel_time": 0.5
    }
  ]
}

const params = computed(() => {
  return {
    areaId: route.query.area as GameAreaId,
    hour: parseInt((route.query.hour ?? "0") as string),
    mode: (route.query.mode ?? "origin") as "origin" | "destination",
    design: designs.selectedDesign
  }
});

// status.value.debug("Data");
</script>
