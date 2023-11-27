<script lang="ts">
import { defineComponent, ref, onMounted, provide } from 'vue';
import NavBar from './components/NavBar.vue'
import MobileNavBar from './components/MobileNavBar.vue';
import type { RoomData } from './types/RoomData';
import type { ForecastData } from './types/ForecastData';

export default defineComponent({
    name: 'App',
    components: { NavBar, MobileNavBar },
    setup() {
      const roomData = ref<RoomData>();
      const roomPredictions = ref<ForecastData>();
      const mobileDialog = ref<boolean>(false);

      const handleShowMobileRoomData = () => {
        if (window.innerWidth < 1280) {
          mobileDialog.value = true
        }
        
      }

      return { roomData, roomPredictions, mobileDialog, handleShowMobileRoomData };
    }
})
</script>

<template>
  <v-layout class="layout">
    <NavBar :roomData="roomData" :roomPredictions="roomPredictions" class="d-none d-lg-block"/>
    <MobileNavBar :roomData="roomData" :mobileDialog="mobileDialog" class="d-lg-none" @closeMobileDialog="mobileDialog = false"/>
    <v-main>
      <RouterView @showRoomData="(data: RoomData, predictions: ForecastData) => { roomData = data; roomPredictions = predictions; handleShowMobileRoomData() }"
                  @upd="(predictions: ForecastData) => { roomPredictions = predictions; }"/>
    </v-main>
  </v-layout>
</template>

<style>
::-webkit-scrollbar {
    width: 10px;
    display:none;
}

::-webkit-scrollbar-track {
    background: white;
}

::-webkit-scrollbar-thumb {
    background: #888;
}

::-webkit-scrollbar-thumb:hover {
    background: #555;
}
</style>
