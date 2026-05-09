<script setup lang="ts">
import type { SimulationResult } from 'src/stores/simulation';

const props = defineProps<{
    simulation: SimulationResult;
}>();

</script>

<template>
    <tbody>
        <tr>
            <td>Total demand</td>
            <td class="text-right">{{ props.simulation.demands_processed }}</td>
        </tr>
        <tr>
            <td>Number of OD pairs</td>
            <td class="text-right">{{ props.simulation.input_demands_count }}</td>
        </tr>
        <tr>
            <td>Total units</td>
            <td class="text-right">{{ props.simulation.total_units }}</td>
        </tr>
        <tr>
            <td>Total travel time (min)</td>
            <td class="text-right">{{ props.simulation.total_time_minutes }}</td>
        </tr>
        <tr>
            <td>Total fare (CHF)</td>
            <td class="text-right">{{ props.simulation.total_fare }}</td>
        </tr>
    </tbody>
</template>