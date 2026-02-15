<script setup lang="ts">
import type { HexagonGeoJSON } from 'src/stores/gameAreasStore';
import { ref } from 'vue';

const props = defineProps<{
    currentHex: HexagonGeoJSON["features"][number] | null | undefined;
    hour: number;
}>();

const hexPanelOpen = ref(false);

</script>

<template>
    <q-expansion-item v-if="props.currentHex" label="Hexagon" header-class="text-h6" v-model="hexPanelOpen">
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
            <div class="q-mt-md inspector-heading">Properties</div>
            <q-markup-table flat>
                <tbody>
                    <tr>
                        <td>Hex ID</td>
                        <td class="text-right">{{ props.currentHex.properties?.hex_id }}</td>
                    </tr>
                </tbody>
            </q-markup-table>

            <div class="q-mt-md inspector-heading">Demand (hour {{ props.hour }})</div>
            <q-markup-table flat>
                <tbody>
                    <tr>
                        <td>Origin</td>
                        <td class="text-right">{{ props.currentHex.properties?.[`Out_${props.hour}`] }}</td>
                    </tr>
                    <tr>
                        <td>Destination</td>
                        <td class="text-right">{{ props.currentHex.properties?.[`In_${props.hour}`] }}</td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td class="text-right">{{ props.currentHex.properties?.[`${props.hour}`] }}</td>
                    </tr>
                </tbody>
            </q-markup-table>
        </div>
    </q-expansion-item>
</template>