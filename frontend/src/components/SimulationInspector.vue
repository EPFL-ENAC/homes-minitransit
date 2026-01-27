<script setup lang="ts">
import type { SimulationResult } from 'src/stores/simulation';

const props = defineProps<{
    simulation: SimulationResult;
}>();

</script>

<template>
    <tbody>
        <tr>
            <td>Simulation duration</td>
            <td class="text-right">{{ props.simulation.simulation_time }}</td>
        </tr>
        <tr>
            <td>Simulation hour</td>
            <td class="text-right">{{ props.simulation.simulation_hour }}</td>
        </tr>
        <tr>
            <td>Demands processed</td>
            <td class="text-right">{{ props.simulation.demands_processed }}</td>
        </tr>
        <tr>
            <td>Sampling enabled</td>
            <td class="text-right">{{ props.simulation.sampling_enabled ? 'Yes' : 'No' }}</td>
        </tr>
        <tr>
            <td>Network routes taken</td>
            <td class="text-right">{{ props.simulation.network_routes_taken }}</td>
        </tr>
        <tr>
            <td>Routes generated</td>
            <td class="text-right">{{ props.simulation.routes_generated }}</td>
        </tr>
        <tr>
            <td>Input demands</td>
            <td class="text-right">{{ props.simulation.input_demands_count }}</td>
        </tr>
        <tr>
            <td>Total units</td>
            <td class="text-right">{{ props.simulation.total_units }}</td>
        </tr>
        <tr>
            <td>Total time (min)</td>
            <td class="text-right">{{ props.simulation.total_time_minutes }}</td>
        </tr>
        <tr>
            <td>Total fare</td>
            <td class="text-right">{{ props.simulation.total_fare }}</td>
        </tr>
        <tr>
            <td>Average fare</td>
            <td class="text-right">{{ props.simulation.average_fare }}</td>
        </tr>
    </tbody>
</template>