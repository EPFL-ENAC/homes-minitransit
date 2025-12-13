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

const params = computed(() => {
  return {
    areaId: route.query.area as GameAreaId,
    hour: parseInt((route.query.hour ?? "0") as string),
    mode: (route.query.mode ?? "origin") as "origin" | "destination",
    design: designs.selectedDesign
  }
});
</script>
