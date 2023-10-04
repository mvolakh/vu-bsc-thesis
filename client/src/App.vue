<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import NavBar from './components/NavBar.vue'

export default defineComponent({
    name: 'App',
    components: { NavBar },
    setup() {
      return {};
    }
})
</script>

<template>
  <v-layout>
    <NavBar/>
    <v-main>
      <RouterView />
    </v-main>
  </v-layout>
</template>

<style scoped>
</style>
