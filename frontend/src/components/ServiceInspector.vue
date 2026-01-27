<script setup lang="ts">
import { type DesignService, FixedRouteService, OnDemandDockedService } from 'src/lib/designs/services';

const props = defineProps<{
    service: DesignService;
}>();

</script>

<template>
    <tbody>
        <template v-if="(props.service instanceof FixedRouteService)">
            <tr>
                <td>Type</td>
                <td class="text-right">Fixed Route</td>
            </tr>
            <tr>
                <td>Capacity</td>
                <td class="text-right">{{ props.service.fixedRouteService.capacity }}</td>
            </tr>
            <tr>
                <td>Number of stops</td>
                <td class="text-right">{{ props.service.fixedRouteService.stops.length }}</td>
            </tr>
            <tr>
                <td>Frequency</td>
                <td class="text-right">{{ props.service.fixedRouteService.frequency }}</td>
            </tr>
            <tr>
                <td>Stopping time</td>
                <td class="text-right">{{ props.service.fixedRouteService.stopping_time }}</td>
            </tr>
            <tr>
                <td>Travel time</td>
                <td class="text-right">{{ props.service.fixedRouteService.travel_time }}</td>
            </tr>
        </template>
        <template v-else-if="(props.service instanceof OnDemandDockedService)">
            <tr>
                <td>Type</td>
                <td class="text-right">On Demand Docked</td>
            </tr>
            <tr>
                <td>Capacity</td>
                <td class="text-right">{{ props.service.onDemandService.capacity }}</td>
            </tr>
            <tr>
                <td>Number of stops</td>
                <td class="text-right">{{ props.service.onDemandService.docking_stations.length }}</td>
            </tr>
            <tr>
                <td>Number of vehicles</td>
                <td class="text-right">{{ props.service.onDemandService.vehicles.length }}</td>
            </tr>
        </template>
    </tbody>
</template>