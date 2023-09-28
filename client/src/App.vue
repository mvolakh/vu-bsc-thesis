<script lang="ts">
import { defineComponent } from 'vue';

import NavBar from './components/NavBar.vue'

export default defineComponent({
    name: 'App',
    components: { NavBar },
    setup() {}
})
</script>

<template>
  <v-card>
    <v-layout>
      <NavBar/>
      <v-main>
        <RouterView />
      </v-main>
    </v-layout>
  </v-card>
</template>

<style scoped>
</style>
