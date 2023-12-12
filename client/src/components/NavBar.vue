<script lang="ts">
import { defineComponent, inject, ref, computed, watch } from 'vue';
import type { RoomData } from '../types/RoomData';
import type { SensorData } from '../types/SensorData';
import SensorDetails from './SensorDetails.vue';
import type { ForecastData } from '@/types/ForecastData';
import type { Floor } from '@/types/Floor';

export default defineComponent({
    name: 'Home',
    components: { SensorDetails },
    props: {
        roomData: Object as () => RoomData,
        sensorData: Object as () => SensorData,
        roomPredictions: Object as () => ForecastData,
        sensorPredictions: Object as () => ForecastData,
        updateSuccess: Boolean
    },
    emits: ['switchMode', 'updateForecasts', 'updateSelectedFloor', 'updatePredictionModel', 'updateRailStatus'],
    setup(props, { emit }) {
        const drawer = ref<boolean>(true);
        const rail = ref<boolean>(false);
        const mode = ref<boolean>(true);
        const selectedFloor = ref<number>(11);
        const modeText = ref<string>("Display rooms");
        const updateProgress = ref<number>(0);
        const updateStatus = ref<boolean>(false);
        const floors = ref<Floor[]>([
            { title: 'Floor 10', value: 10, icon: '', disabled: false },
            { title: 'Floor 11', value: 11, icon: '', disabled: false },
            { title: 'Floor 12', value: 12, icon: '', disabled: false },
        ]);

        const switchMode = () => {
            mode.value = !mode.value
            if (mode.value) {
                modeText.value = "Display rooms"
            } else {
                modeText.value = "Display sensors"
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

        watch(() => rail.value, () => {
            if (!rail.value) {
                // when opened
                for (const floor of floors.value) {
                    floor.icon = ''
                }
            } else {
                // when closed
                for (const floor of floors.value) {
                    floor.icon = `mdi-keyboard-f${floor.value}`
                }
            }
            updateStatus.value = !updateStatus.value;
            emit('updateRailStatus', rail)
        })
        
        return { 
            drawer, 
            rail, 
            floors, 
            mode,
            modeText, 
            updateProgress, 
            updateStatus,
            switchMode,
            selectFloor
        }
    }
})
</script>

<template>
    <v-navigation-drawer
        v-model="drawer"
        :rail="rail"
        @click="rail = false"
    >
        <v-list-item
        prepend-avatar="https://assets.vu.nl/d8b6f1f5-816c-005b-1dc1-e363dd7ce9a5/5bbfe2a6-ef6a-4dd9-8bdf-6250e834266e/VU_social_avatar_wit.png"
        title="NU Gebouw"
        nav
        >
        <template v-slot:append>
            <v-btn
            variant="text"
            icon="mdi-chevron-left"
            @click.stop="rail = !rail"
            ></v-btn>
        </template>
        </v-list-item>

        <v-divider></v-divider>

        <v-list density="compact" nav>
            <v-list-item
                v-for="item in floors"
                :key="item.value"
                :title="item.title"
                :value="item.value"
                :prepend-icon="item.icon"
                :disabled="item.disabled"
                @click="selectFloor(item.value)"
            >

            </v-list-item>
        </v-list>

        <v-row justify="center" class="mt-3" v-if="!rail">
            <v-btn @click="switchMode(); $emit('switchMode', mode);">{{ modeText }}</v-btn>
        </v-row>
        <v-row justify="center" class="mt-5" v-if="!rail">
            <v-btn @click="$emit('updateForecasts'); updateProgress = 1">
                Update Forecasts
                <v-progress-circular indeterminate color="blue-lighten-3" size="20" v-if="updateProgress == 1"></v-progress-circular>
                <v-icon v-else-if="updateProgress == 2" icon="mdi-check"></v-icon>
            </v-btn>
        </v-row>

        <SensorDetails 
            v-if="(!rail && roomData) || (!rail && sensorData)" 
            :roomData="roomData" 
            :sensorData="sensorData" 
            :roomPredictions="roomPredictions" 
            :sensorPredictions="sensorPredictions" 
            :updateStatus="updateStatus"
            @updatePredictionModel="(model: string) => $emit('updatePredictionModel', model)" 
            class="scrollable"/>
    </v-navigation-drawer>
</template>

<style scoped>
.scrollable {
    overflow-y: scroll;
    max-height: 65%;
}

::-webkit-scrollbar {
    width: 10px;
    display: block;
}
</style>