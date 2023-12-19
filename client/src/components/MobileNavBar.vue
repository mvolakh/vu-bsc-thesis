<script lang="ts">
import { defineComponent, inject, ref, watch } from 'vue';
import type { RoomData } from '../types/RoomData';
import MobileSensorDetails from './MobileSensorDetails.vue';
import type { ForecastData } from '@/types/ForecastData';
import type { SensorData } from '../types/SensorData';
import type { Floor } from '@/types/Floor';

export default defineComponent({
    name: 'MobileNavBar',
    components: { MobileSensorDetails },
    emits: ["closeMobileDialog", 'switchMode', 'updateForecasts', 'updateSelectedFloor', 'updatePredictionModel'],
    props: {
        roomData: Object as () => RoomData,
        sensorData: Object as () => SensorData,
        roomPredictions: Object as () => ForecastData,
        sensorPredictions: Object as () => ForecastData,
        updateSuccess: Boolean,
        mobileDialog: Boolean
    },
    setup(props, { emit }) {
        const menuVisible = ref(false);
        const mode = ref<boolean>(true);
        const modeIcon = ref<string>("mdi-sofa"); 
        const selectedFloor = ref<number>(11);
        const updateProgress = ref<number>(0);
        const updateStatus = ref<boolean>(false);
        const floors = ref<Floor[]>([
            { title: 'Floor 10', value: 10, icon: 'mdi-keyboard-f10', disabled: false },
            { title: 'Floor 11', value: 11, icon: 'mdi-keyboard-f11', disabled: false },
            { title: 'Floor 12', value: 12, icon: 'mdi-keyboard-f12', disabled: false },
        ]);

        const switchMode = () => {
            mode.value = !mode.value
            if (mode.value) {
                modeIcon.value = "mdi-sofa"
            } else {
                modeIcon.value = "mdi-access-point"
            }
        }

        const selectFloor = (floor: number) => {
            selectedFloor.value = floor;

            emit("updateSelectedFloor", selectedFloor.value)
        };

        watch(() => props.updateSuccess, async () => {
            updateProgress.value = 2;
            // updateStatus.value = !updateStatus.value;
            setTimeout(() => {
                updateProgress.value = 0;
            }, 5000);
        });
        
        return { menuVisible, updateStatus, floors, selectFloor, switchMode, mode, modeIcon } 
    }
})
</script>

<template>
    <v-app-bar>
        <router-link to="/" class="ml-5">
            <v-avatar image="https://assets.vu.nl/d8b6f1f5-816c-005b-1dc1-e363dd7ce9a5/5bbfe2a6-ef6a-4dd9-8bdf-6250e834266e/VU_social_avatar_wit.png"></v-avatar>
        </router-link>
        <v-app-bar-title>NU Gebouw</v-app-bar-title>
        
        <v-btn @click="switchMode(); $emit('switchMode', mode);" :icon="modeIcon"></v-btn>

        <v-btn 
            v-for="item in floors"
            :key="item.value"
            :title="item.title"
            :value="item.value"
            :icon="item.icon"
            :disabled="item.disabled"
            @click="selectFloor(item.value)"
        ></v-btn>
        
        <v-dialog v-model="mobileDialog" fullscreen :scrim="false" transition="dialog-bottom-transition" class="d-lg-none">
            <MobileSensorDetails
                v-if="(roomData) || (sensorData)" 
                :roomData="roomData" 
                :sensorData="sensorData" 
                :roomPredictions="roomPredictions" 
                :sensorPredictions="sensorPredictions" 
                :updateStatus="updateStatus"
                @updatePredictionModel="(model: string) => $emit('updatePredictionModel', model)" 
                @closeMobileDialog="$emit('closeMobileDialog')"/>
        </v-dialog>
    </v-app-bar>
    


</template>

<style scoped>
</style>