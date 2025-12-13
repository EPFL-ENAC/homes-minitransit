<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import 'maplibregl-theme-switcher/styles.css';
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
import { addOrUpdateGeoJsonSourceToMap, cleanUpDesign, drawDesignToMap, getCenterPointOfGeoJSON } from './mapUtils';

interface Props {
    style?: string | StyleSpecification | undefined
    center?: LngLatLike;
    zoom?: number
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

const { resultRef: map, trigger: loadMap } = useLazyAction<Map>(() => {
    return new Promise<Result<Map>>((resolve) => {
        const m = new Map({
            container: container.value!, // container id
            style: '/style.json', // style URL
            center: props.center ?? [0, 0], // starting position [lng, lat]
            zoom: props.zoom ?? 1 // starting zoom
        });

        void m.once('load', () => {
            setTimeout(() => { resolve(Result.ok(m)); }, 3000);
            resolve(Result.ok(m));
        });
    });
});

const tasks = useAsyncResultCollection();

const container = useTemplateRef<HTMLDivElement>('container');

onMounted(() => {
    loadMap();
    tasks.value.add("map", map.value, false);
});

watch(gameState, (newArea, oldArea) => {
    if (!newArea) return;

    return tasks.value.add(`area-${crypto.randomUUID()}`, AsyncResult.run(function *() {
        const m = yield* map.value;

        const demandKey = `${newArea.mode === 'origin' ? 'Out' : 'In'}_${newArea.hour}`;
        if (newArea.areaId !== oldArea?.areaId) {
            const geometry = yield* gameAreaStore.getGameAreaGeometry({
                areaId: newArea.areaId,
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

        m.setPaintProperty("data-fill", "fill-color", [
            'interpolate',
            ['linear'],
            ['get', demandKey],
            0, '#0000ff',
            50, '#eeee00',
            100, '#ff0000'
        ]);

        if (newArea.design) {
            drawDesignToMap(m, newArea.design, "data");
        } else if (oldArea?.design) {
            cleanUpDesign(m, oldArea.design);
        }
    }));
});

</script>

<template>
    <div ref="container" class="maplibre-map"></div>
    <div v-if="tasks.anyLoading()" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
        <q-spinner-dots color="primary" size="100px" />
    </div>
</template>

<style scoped>
.maplibre-map {
    height: 95vh;
    width: 100vw;
}
</style>