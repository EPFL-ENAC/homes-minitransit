<script setup lang="ts">
import { type GameAreaId, gameAreas } from 'app/utils/areasUtils';
import { useDesignsStore } from 'src/stores/designs';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const designsStore = useDesignsStore();

const currentAreaId = computed(() => route.query.area as GameAreaId | undefined);
const currentHour = computed(() => parseInt((route.query.hour ?? "0") as string));
const currentMode = computed(() => (route.query.mode ?? "origin") as "origin" | "destination");

const gameAreasList = computed(() => Object.values(gameAreas));

interface DemandPageUrlParams {
    area?: GameAreaId | undefined;
    hour: number;
    mode: "origin" | "destination";
}

function makeDemandPageUrl(params: DemandPageUrlParams) {
    return `/?area=${params.area ?? ''}&hour=${params.hour}&mode=${params.mode}`;
}

function goToUpdatedParams(p: Partial<DemandPageUrlParams>) {
    return router.push(makeDemandPageUrl({
        area: p.area ?? currentAreaId.value,
        hour: p.hour ?? currentHour.value,
        mode: p.mode ?? currentMode.value
    }));
}

function areaChanged(newId: GameAreaId) {
    designsStore.file = null;
    void goToUpdatedParams({ area: newId });
}

</script>

<template>
    <q-scroll-area class="fit">
        <div class="q-pa-md">
            <q-list>
                <template v-for="area in gameAreasList" :key="area.id">
                    <q-item
                        clickable
                        :active="area.id === currentAreaId"
                        v-ripple
                        @click="areaChanged(area.id)"
                    >
                        <q-item-section avatar>
                            <q-icon name="send" />
                        </q-item-section>
                        <q-item-section>
                            {{ area.name }}
                        </q-item-section>
                    </q-item>
                </template>
            </q-list>
        </div>

        <div class="q-pa-md">
            <div class="q-gutter-sm">
                <q-radio
                    :model-value="currentMode"
                    @update:model-value="(e) => goToUpdatedParams({ mode: e })"
                    dense
                    val="origin"
                    label="Origin"
                />
                <q-radio
                    :model-value="currentMode"
                    @update:model-value="(e) => goToUpdatedParams({ mode: e })"
                    dense
                    val="destination"
                    label="Destination"
                />
            </div>
        </div>

        <div class="q-pa-md">
            <q-slider
                :model-value="currentHour"
                @update:model-value="(e) => goToUpdatedParams({ hour: e ?? 0 })"
                :min="0"
                :max="23"
                label
                :markers="4"
                marker-labels
            />
        </div>

        <div class="q-pa-md">
            <q-file
                v-model="designsStore.file"
                label="Add a design"
                filled
                clearable
            />
        </div>
    </q-scroll-area>
</template>
