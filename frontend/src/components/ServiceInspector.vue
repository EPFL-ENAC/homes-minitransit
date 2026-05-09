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
                <td>Capacity per vehicle</td>
                <td class="text-right">{{ props.service.fixedRouteService.capacity }}</td>
            </tr>
            <tr>
                <td>Number of stops</td>
                <td class="text-right">{{ props.service.fixedRouteService.stops.length }}</td>
            </tr>
            <tr>
                <td>Headway (min)</td>
                <td class="text-right">{{ props.service.fixedRouteService.frequency }}</td>
            </tr>
            <tr>
                <td>Stopping time</td>
                <td class="text-right">{{ props.service.fixedRouteService.stopping_time }}</td>
            </tr>
            <tr>
                <td>Speed (hex per min)</td>
                <td class="text-right">{{ props.service.fixedRouteService.travel_time }}</td>
            </tr>
            <tr>
                <td>Base fare</td>
                <td class="text-right">{{ props.service.fixedRouteService.base_fare ?? '2.4 (default)' }}</td>
                <!-- IMPORTANT: needs to be in sync with simulation_config.json in the backend -->
            </tr>
        </template>
        <template v-else-if="(props.service instanceof OnDemandDockedService)">
            <tr>
                <td>Type</td>
                <td class="text-right">Docked Bikesharing</td>
            </tr>
            <tr v-if="props.service.onDemandService.capacity > 1">
                <td>Capacity</td>
                <td class="text-right">{{ props.service.onDemandService.capacity }}</td>
            </tr>
            <tr>
                <td>Number of stops</td>
                <td class="text-right">{{ props.service.onDemandService.docking_stations.length }}</td>
            </tr>
            <tr>
                <td>Fleet size</td>
                <td class="text-right">{{ props.service.onDemandService.vehicles.reduce((sum, vehicle) => sum + vehicle.capacity, 0) }}</td>
            </tr>
            <tr>
                <td>Total dock capacity</td>
                <td class="text-right">{{ props.service.onDemandService.docking_stations.reduce((sum, station) => sum + station.capacity, 0) }}</td>
            </tr>
            <tr>
                <td>Speed (hex per min, fixed)</td>
                <td class="text-right">12</td>
                <!-- IMPORTANT: needs to be in sync with simulation_config.json in the backend -->
            </tr>
            <tr>
                <td>Base fare</td>
                <td class="text-right">{{ props.service.onDemandService.ondemand_base_fare }}</td>
            </tr>
            <tr>
                <td>Base time cutoff (min)</td>
                <td class="text-right">{{ props.service.onDemandService.ondemand_base_time_cutoff_minutes }}</td>
            </tr>
            <tr>
                <td>Time rate per minute</td>
                <td class="text-right">{{ props.service.onDemandService.ondemand_time_rate_per_minute }}</td>
            </tr>
        </template>
    </tbody>
</template>