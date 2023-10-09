<script lang="ts">
import { defineComponent, ref, onMounted, provide } from 'vue';
import NavBar from './components/NavBar.vue'
import type { RoomData } from './types/RoomData';

export default defineComponent({
    name: 'App',
    components: { NavBar },
    setup() {
      const roomData = ref<RoomData>();

      return { roomData };
    }
})
</script>

<template>
  <v-layout>
    <NavBar :roomData="roomData" />
    <v-main>
      <RouterView @showRoomData="(data: RoomData) => { roomData = data }"/>
    </v-main>
  </v-layout>
</template>

<style scoped>
</style>
