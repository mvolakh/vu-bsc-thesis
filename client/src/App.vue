<script lang="ts">
import { defineComponent, ref, onMounted, provide } from 'vue';
import type { ComponentPublicInstance } from 'vue'
import NavBar from './components/NavBar.vue'
import MobileNavBar from './components/MobileNavBar.vue';
import type { RoomData } from './types/RoomData';
import type { SensorData } from './types/SensorData';
import type { ForecastData } from './types/ForecastData';
import type { RouterView } from 'vue-router';

export default defineComponent({
    name: 'App',
    components: { NavBar, MobileNavBar },
    setup() {
      const roomData = ref<RoomData>();
      const sensorData = ref<SensorData>();
      const roomPredictions = ref<ForecastData>();
      const sensorPredictions = ref<ForecastData>();
      const mobileDialog = ref<boolean>(false);
      const mode = ref<boolean>(true);
      const updateForecasts = ref<boolean>(false);
      const updateSuccess = ref<boolean>(false);
      const selectedFloor = ref<number>(11);
      const selectedPredictionModel = ref<string>('LSTM');
      const rail = ref<boolean>(false);

      const handleShowMobile = () => {
        if (window.innerWidth < 1280) {
          mobileDialog.value = true
        }
      }

      return { 
        roomData, 
        sensorData, 
        roomPredictions, 
        sensorPredictions, 
        mobileDialog, 
        mode, 
        updateForecasts, 
        updateSuccess,
        selectedFloor,
        selectedPredictionModel,
        rail,
        handleShowMobile
      };
    }
})
</script>

<template>
  <v-layout class="layout">
    <NavBar 
      :roomData="roomData" 
      :sensorData="sensorData" 
      :roomPredictions="roomPredictions" 
      :sensorPredictions="sensorPredictions"
      :updateSuccess="updateSuccess"
      @switchMode="(newMode: boolean) => mode = newMode" 
      @updateForecasts="updateForecasts = !updateForecasts"
      @updateSelectedFloor="(newSelectedFloor: number) => selectedFloor = newSelectedFloor"
      @updatePredictionModel="(newSelectedModel: string) => selectedPredictionModel = newSelectedModel"
      @updateRailStatus="(railStatus: boolean) => rail = railStatus"
      class="d-none d-lg-block"/>
    <MobileNavBar 
      :roomData="roomData"
      :sensorData="sensorData"
      :roomPredictions="roomPredictions" 
      :sensorPredictions="sensorPredictions" 
      :mobileDialog="mobileDialog"
      :updateSuccess="updateSuccess"
      @switchMode="(newMode: boolean) => mode = newMode" 
      @updateForecasts="updateForecasts = !updateForecasts"
      @updateSelectedFloor="(newSelectedFloor: number) => selectedFloor = newSelectedFloor"
      @updatePredictionModel="(newSelectedModel: string) => selectedPredictionModel = newSelectedModel"
      @closeMobileDialog="mobileDialog = false"
      class="d-lg-none"/>
    <v-main>
      <RouterView ref="childComponentRef"
                  @showRoomData="(data: RoomData, predictions: ForecastData) => { roomData = data; roomPredictions = predictions; handleShowMobile() }"
                  @showSensorData="(data: SensorData, predictions: ForecastData) => { sensorData = data; sensorPredictions = predictions; handleShowMobile() }"
                  @upd="(predictions: ForecastData) => { roomPredictions = predictions; }"
                  @showUpdateSuccess="updateSuccess = !updateSuccess"
                  :mode="mode" 
                  :updateForecasts="updateForecasts"
                  :selectedFloor="selectedFloor"
                  :selectedPredictionModel="selectedPredictionModel"
                  :rail="rail"
                  />
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
