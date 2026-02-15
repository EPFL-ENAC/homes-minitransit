<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css';
// import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
// import 'maplibregl-theme-switcher/styles.css';
// import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
// import { ThemeSwitcherControl, ThemeDefinition } from 'maplibregl-theme-switcher';
import {
    Map,
    type LngLatLike,
    type StyleSpecification
} from 'maplibre-gl';
import { onMounted, useTemplateRef } from 'vue';
import { useLazyAction, useAsyncResultCollection } from 'unwrapped/vue';
import { AsyncResult, Result } from 'unwrapped/core';
import { useGameAreasStore, type GameState } from 'src/stores/gameAreasStore';
import { type SimulationRoute, useSimulationsStore } from 'src/stores/simulation';
import { HexagonMesh } from 'src/lib/designs/hexagons/hexagonMesh';
import { RoutesMesh } from 'src/lib/designs/routes/routes';
import { useGameStateStore } from 'src/stores/gameState';

interface Props {
    style?: string | StyleSpecification | undefined;
    center?: LngLatLike;
    zoom?: number;
}
const props = defineProps<Props>();

const gameAreaStore = useGameAreasStore();
const simulationsStore = useSimulationsStore();
const gameStateStore = useGameStateStore();

const { resultRef: map, trigger: loadMap } = useLazyAction<Map>(() => {
    return new Promise<Result<Map>>((resolve) => {
        const m = new Map({
            container: container.value!, // container id
            style: '/style.json', // style URL
            center: props.center ?? [0, 0], // starting position [lng, lat]
            zoom: props.zoom ?? 1 // starting zoom
        });

        void m.once('load', () => {
            postLoad(m);
            resolve(Result.ok(m));
        });
    });
});

const tasks = useAsyncResultCollection();

const container = useTemplateRef<HTMLDivElement>('container');

onMounted(() => {
    loadMap();
    tasks.value.add("map", map.value, false);

    gameStateStore.gameState.listen((result, oldState) => {
        updateState(result, oldState?.status === "success" ? oldState.value : undefined);
    });
});


const hexagons = new HexagonMesh();
const routes = new RoutesMesh();

function postLoad(m: Map) {
    hexagons.drawOnMap(m);
    hexagons.onClicked((hexId) => {
        gameStateStore.updateState({ pickedHexId: hexId });
    });
    routes.drawOnMap(m);
}

function updateState(newStateResult: AsyncResult<GameState>, oldState: GameState | undefined) {
    return tasks.value.add(`map-update-${crypto.randomUUID()}`, AsyncResult.run(function* () {
        const newState = yield* newStateResult;

        if (!newState.areaId) {
            return;
        }
        
        const m = yield* map.value;

        const demandKey = `${newState.mode === 'origin' ? 'Out' : 'In'}_${newState.hour}`;

        if (newState.areaId !== oldState?.areaId) {
            const geometry = yield* gameAreaStore.getGameAreaGeometry({
                areaId: newState.areaId,
                reprojectToWGS84: true
            });
            hexagons.setGeoJSON(geometry);

            const center = hexagons.getCenterPoint();
            if (center) {
                m.flyTo({
                    duration: 1000,
                    center,
                    zoom: 11.5
                });
            }
        }

        hexagons.setDemandKey(demandKey, newState.showDemand);

        if (newState.design) {
            if (newState.design !== oldState?.design) {
                newState.design.drawOnMap(m, hexagons, (service) => {
                    gameStateStore.updateState({ pickedServiceName: service.name });
                });
            }
            newState.design.selectService(newState.pickedServiceName || null);
            newState.design.setVisibleServices(newState.shownServices);
        } else if (oldState?.design) {
            oldState.design.removeFromMap();
        }

        const simulationId = newState.simulationId;
        if (!simulationId) {
            routes.setRoutes([], hexagons, newState.design);
            return;
        }

        yield* simulationsStore.getSimulationResult({
            simulationId: simulationId,
        });

        let simulatedRoutes: SimulationRoute[] = [];

        if (newState.pickedHexId) {
            simulatedRoutes = yield* simulationsStore.getSimulationRoute(
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

        routes.setRoutes(simulatedRoutes, hexagons, newState.design);
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