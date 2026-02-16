<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        
        <q-toolbar-title>
          MiniTransit
        </q-toolbar-title>
        
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above side="left" bordered width-hint="250">
      <router-view name="drawer" />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-drawer v-model="rightDrawerOpen" show-if-above side="right" bordered width-hint="350" :width="470">
      <router-view name="rightDrawer" />
    </q-drawer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}
</script>
