<script setup lang="ts">
import type { TransitSystemDesign } from 'src/lib/designs/transitSystemDesign';
import type { HexagonGeoJSON } from 'src/stores/gameAreasStore';
import { computed, ref } from 'vue';

const props = defineProps<{
    currentHex: HexagonGeoJSON["features"][number] | null | undefined;
    hour: number;
    design: TransitSystemDesign | null;
}>();

const hexPanelOpen = ref(false);

function formatDemand(value: number | undefined): string {
    if (value === undefined) {
        return "N/A";
    }
    return value.toFixed(2);
}

const infos = computed(() => {
    if (!props.currentHex || !props.design) {
        return [];
    }
    return props.design.infoForHexagon(props.currentHex.properties?.hex_id ?? -1) ?? [];
});

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
                        <td class="text-right">{{ formatDemand(props.currentHex.properties?.[`Out_${props.hour}`]) }}</td>
                    </tr>
                    <tr>
                        <td>Destination</td>
                        <td class="text-right">{{ formatDemand(props.currentHex.properties?.[`In_${props.hour}`]) }}</td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td class="text-right">{{ formatDemand(props.currentHex.properties?.[`${props.hour}`]) }}</td>
                    </tr>
                </tbody>
            </q-markup-table>

            <template v-if="infos.length > 0">
                <div class="q-mt-md inspector-heading">Services</div>
                <ul>
                    <li v-for="serviceInfo in infos" :key="serviceInfo.service.name">
                        {{ serviceInfo.service.name }}
                        <ul v-if="serviceInfo.type === 'fixed_route'">
                            <li><b>Stop ID:</b> {{ serviceInfo.stopId }}</li>
                        </ul>
                        <ul v-else-if="serviceInfo.type === 'on_demand_docked'">
                            <li><b>Dock ID:</b> {{ serviceInfo.dockId }}</li>
                            <li><b>Dock capacity:</b> {{ serviceInfo.dockCapacity }}</li>
                        </ul>
                    </li>
                </ul>
            </template>
        </div>
    </q-expansion-item>
</template>