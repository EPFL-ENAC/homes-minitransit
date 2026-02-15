<script setup lang="ts">
import type { GameState } from 'src/stores/gameAreasStore';
import { useGameStateStore } from 'src/stores/gameState';

const gameStateStore = useGameStateStore();

const props = defineProps<{
    state: GameState
}>();

</script>

<template>
    <q-list v-if="props.state.design">
        <template v-for="service in props.state.design.services" :key="service.name">
            <q-item clickable :active="service.name === props.state.pickedServiceName" v-ripple @click="() => gameStateStore.updateState({ pickedServiceName: service.name })">
                <q-item-section>
                    {{ service.name }}
                </q-item-section>
                <q-item-section side>
                    <q-toggle :model-value="props.state.shownServices.has(service.name)" @update:model-value="(e) => gameStateStore.showService(service.name, e)" />
                </q-item-section>
            </q-item>
        </template>
    </q-list>
</template>