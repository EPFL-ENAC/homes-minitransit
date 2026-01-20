<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css';
// import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
// import 'maplibregl-theme-switcher/styles.css';
// import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
// import { ThemeSwitcherControl, ThemeDefinition } from 'maplibregl-theme-switcher';
import {
    // AttributionControl,
    // FullscreenControl,
    // GeolocateControl,
    // LngLat,
    Map,
    // MapMouseEvent,
    // Marker,
    // NavigationControl,
    // ScaleControl,
    type LngLatLike,
    type StyleSpecification
} from 'maplibre-gl';
import { onMounted, useTemplateRef, watch } from 'vue';
import { useLazyAction, useAsyncResultCollection } from 'unwrapped/vue';
import { AsyncResult, Result } from 'unwrapped/core';
import { useGameAreasStore, type GameState } from 'src/stores/gameAreasStore';
import { addOrUpdateGeoJsonSourceToMap, drawDesignToMap, drawRoutesOnMap, getCenterPointOfGeoJSON, setupHexagonInteractivity } from './mapUtils';
import { type SimulationRoute, useSimulationsStore } from 'src/stores/simulation';

interface Props {
    style?: string | StyleSpecification | undefined;
    center?: LngLatLike;
    zoom?: number;
    /* minZoom?: number
    maxZoom?: number
    themes?: ThemeDefinition[]
    position?: boolean | string | undefined
    geocoder?: boolean | string | undefined
    attribution?: string */
}
const props = defineProps<Props>();

const gameState = defineModel<GameState>("gameState");
const gameAreaStore = useGameAreasStore();
const simulationsStore = useSimulationsStore();

const emit = defineEmits<{
    (e: "hexagonClicked", hexId: number, properties: Record<string, unknown>): void;
    (e: "serviceClicked", serviceName: string): void;
}>();

const { resultRef: map, trigger: loadMap } = useLazyAction<Map>(() => {
    return new Promise<Result<Map>>((resolve) => {
        const m = new Map({
            container: container.value!, // container id
            style: '/style.json', // style URL
            center: props.center ?? [0, 0], // starting position [lng, lat]
            zoom: props.zoom ?? 1 // starting zoom
        });

        void m.once('load', () => {
            resolve(Result.ok(m));
        });
    });
});

const tasks = useAsyncResultCollection();

const container = useTemplateRef<HTMLDivElement>('container');

onMounted(() => {
    loadMap();
    tasks.value.add("map", map.value, false);
    updateState(gameState.value, undefined);
});

watch(gameState, (newState, oldState) => {
    updateState(newState, oldState);
});

let eventCleanup: (() => void) | null = null;
let designCleanup: (() => void) | null = null;

function updateState(newState: GameState | undefined, oldState: GameState | undefined) {
    if (!newState) return;

    return tasks.value.add(`area-${crypto.randomUUID()}`, AsyncResult.run(function* () {
        const m = yield* map.value;

        const demandKey = `${newState.mode === 'origin' ? 'Out' : 'In'}_${newState.hour}`;
        if (newState.areaId !== oldState?.areaId) {
            const geometry = yield* gameAreaStore.getGameAreaGeometry({
                areaId: newState.areaId,
                reprojectToWGS84: true
            });

            addOrUpdateGeoJsonSourceToMap(m, geometry, "data");

            const center = getCenterPointOfGeoJSON(geometry);
            m.flyTo({
                duration: 1000,
                center,
                zoom: 11.5
            });
        }

        eventCleanup?.();
        eventCleanup = setupHexagonInteractivity(m, "data", demandKey, (hexId, properties) => {
            emit("hexagonClicked", hexId, properties);
        });
        m.setPaintProperty("data-fill", "fill-color", [
            "interpolate",
            ["linear"],
            ["get", demandKey],
            0, "rgb(187, 187, 187)",
            1, "rgb(0, 0, 255)",
            200, "rgb(255, 0, 0)"
        ]);
        m.setPaintProperty("data-fill", "fill-opacity", [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.0,
            0.6
        ]);

        designCleanup?.();
        if (newState.design) {
            designCleanup = drawDesignToMap(m, newState.design, "data", (service) => {
                emit("serviceClicked", service.name);
            }, newState.pickedServiceName ?? undefined);
        } else if (oldState?.design) {
            designCleanup = null;
        }

        const simulationId = newState.simulationId ?? "test";
        if (!simulationId) return;

        yield* simulationsStore.getSimulationResult({
            simulationId: simulationId,
        });

        let routes: SimulationRoute[] = [];

        if (newState.pickedHexId) {
            routes = yield* simulationsStore.getSimulationRoute(
                newState.mode === "origin" ? {
                    simulationParams: {
                        simulationId: simulationId,
                    },
                    type: "out",
                    startHexId: newState.pickedHexId
                } : {
                    simulationParams: {
                        simulationId: simulationId,
                    },
                    type: "in",
                    endHexId: newState.pickedHexId
                }
            );
        }

        drawRoutesOnMap(m, routes, "data", "simulation-routes");

        console.log("Routes for picked hexagon:", routes);
    }));
}

</script>

<template>
    <div ref="container" class="maplibre-map"></div>
    <div v-if="tasks.anyLoading()" class="loading-overlay">
        <q-spinner-dots color="primary" size="100px" />
    </div>
</template>

<style scoped>
.maplibre-map {
    height: 95vh;
    width: 100vw;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.7);
    z-index: 10;
}
</style>