<script lang="ts">
import { defineComponent, ref, onMounted, provide } from 'vue';
import ForecastChart from './ForecastChart.vue'
import type { RoomData } from '../types/RoomData';
import type { SensorData } from '../types/SensorData';
import type { ForecastData } from '../types/ForecastData';

export default defineComponent({
    name: 'MobileSensorDetails',
    components: { ForecastChart },
    emits: ["closeMobileDialog"],
    props: {
        roomData: Object as () => RoomData,
        sensorData: Object as () => SensorData,
        roomPredictions: Object as () => ForecastData,
        sensorPredictions: Object as () => ForecastData,
        updateStatus: Boolean
    },
    setup() {
        function formatDateString(inputDateStr: string) {
            const date = new Date(inputDateStr);

            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${month} ${day} ${hours}:${minutes}`;
        }

        function formatVoltageValue(number: number) {
            if (typeof number !== 'number') {
                return "Unknown";
            }

            const numberString = number.toString();

            if (numberString.includes('.')) {
                return numberString;
            } else if (numberString.length > 3) {
                const integerPart = numberString.slice(0, -3);
                const decimalPart = numberString.slice(-3);

                return `${integerPart}.${decimalPart}`;
            } else {
                return numberString;
            }
        }

        function getOccupancyStatus(colorCode: string) {
            switch (colorCode) {
                case 'green':
                    return 'Currently not too busy';
                case 'orange':
                    return 'Limited capacity';
                case 'red':
                    return 'At maximum capacity';
                case 'grey':
                    return 'Data not available';
                default:
                    return 'Invalid color code';
            }
        }

        function getOccupancyStatusClass(colorCode: string) {
            switch (colorCode) {
                case 'green':
                    return 'text-green';
                case 'red':
                    return 'text-red';
                case 'orange':
                    return 'text-orange';
                case 'grey':
                    return 'text-grey';
                default:
                    return 'text-invalid';
            }
        }

        function calculateRoomAverageLightLevel(roomData: RoomData) {
            if (roomData?.latestSensorData) {
                return Math.trunc((roomData.latestSensorData.color_b + roomData.latestSensorData.color_r + roomData.latestSensorData.color_g) / 3);
            }
        }

        function calculateSensorAverageLightLevel(sensorData: SensorData) {
            if (sensorData?.latestSensorData) {
                return Math.trunc((sensorData.latestSensorData.color_b + sensorData.latestSensorData.color_r + sensorData.latestSensorData.color_g) / 3);
            }
        }

      return { formatDateString, formatVoltageValue, getOccupancyStatus, getOccupancyStatusClass, calculateRoomAverageLightLevel, calculateSensorAverageLightLevel };
    }
})
</script>

<template>
    <v-sheet class="room-card pa-3" :elevation="5" v-if="roomData || sensorData">
        <v-row>
            <v-col class="text-start">
                <h1 v-if="roomData">{{ roomData.name }}</h1>
                <h1 v-if="sensorData">{{ sensorData.room }}</h1>
            </v-col>
            <v-col class="text-end">
                <v-btn variant="plain" icon="mdi-close" @click="$emit('closeMobileDialog')"></v-btn>
            </v-col>
        </v-row>
        <v-row class="mt-0">
            <v-col>
                <small v-if="roomData">{{ roomData?.floor }}<sup>th</sup> Floor</small>
                <small v-if="sensorData">{{ sensorData?.floor }}<sup>th</sup> Floor</small>
            </v-col>
            <v-col class="text-center">
                <small v-if="roomData">{{ roomData?.latestSensorData.sensor }}</small>
                <small v-if="sensorData">{{ sensorData?.name }}</small>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-account-multiple-outline" variant="text" :class="getOccupancyStatusClass(roomData?.colorCode)">
                    {{ getOccupancyStatus(roomData?.colorCode) }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room occupancy status.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-account-multiple-outline" variant="text" :class="getOccupancyStatusClass(sensorData?.colorCode)">
                    {{ getOccupancyStatus(sensorData?.colorCode) }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room occupancy status.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-temperature-celsius" variant="text">
                    {{  Math.floor(roomData?.latestSensorData.temperature / 100) }}°C
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room temperature. Displayed value might be higher than the actual room temperature due to packaging/charging.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-temperature-celsius" variant="text">
                    {{  Math.floor(sensorData?.latestSensorData.temperature / 100) }}°C
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room temperature. Displayed value might be higher than the actual room temperature due to packaging/charging.
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-water" variant="text">
                    {{ roomData?.latestSensorData.humidity }}%
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room humidity level.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-water" variant="text">
                    {{ sensorData?.latestSensorData.humidity }}%
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room humidity level.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-molecule-co2" variant="text">
                    {{ roomData?.latestSensorData.eCO2 }}ppm
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current CO2 level in the room.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-molecule-co2" variant="text">
                    {{ sensorData?.latestSensorData.eCO2 }}ppm
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current CO2 level in the room.
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-gas-cylinder" variant="text">
                    {{ roomData?.latestSensorData.TVOC }}ppm
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current VOC (Volatile Organic Compound) level. Please note that the displayed value might be influenced by various factors, including environmental conditions, and may not always represent the exact VOC concentration.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-gas-cylinder" variant="text">
                    {{ sensorData?.latestSensorData.TVOC }}ppm
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current VOC (Volatile Organic Compound) level. Please note that the displayed value might be influenced by various factors, including environmental conditions, and may not always represent the exact VOC concentration.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-volume-high" variant="text">
                    {{ roomData?.latestSensorData.sound }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current noise level (peak audio sensor amplitude over period).
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-volume-high" variant="text">
                    {{ sensorData?.latestSensorData.sound }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current noise level (peak audio sensor amplitude over period).
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-lightbulb-on" variant="text">
                    {{ calculateRoomAverageLightLevel(roomData) }}lux
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays the current light level in lux (illuminance). Represents the overall intensity of visible light in the environment
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-lightbulb-on" variant="text">
                    {{ calculateSensorAverageLightLevel(sensorData) }}lux
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays the current light level in lux (illuminance). Represents the overall intensity of visible light in the environment
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-signal" variant="text">
                    {{ roomData?.latestSensorData.rssi }}dBm
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current RSSI signal strength to Bluetooth IoT gateway.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-signal" variant="text">
                    {{ sensorData?.latestSensorData.rssi }}dBm
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current RSSI signal strength to Bluetooth IoT gateway.
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-battery-charging" variant="text">
                    {{ formatVoltageValue(roomData?.latestSensorData.voltage) }}V
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current voltage level (V) of the onboard battery. Sensor is recharged when beneath certain level.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-battery-charging" variant="text">
                    {{ formatVoltageValue(sensorData?.latestSensorData.voltage) }}V
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current voltage level (V) of the onboard battery. Sensor is recharged when beneath certain level.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <p v-if="!roomPredictions && !sensorPredictions" class="text-center" style="color: #89C4F4;"><small>Room occupancy predictions are currently unavailable.</small></p>
                <ForecastChart v-else-if="roomPredictions" :roomPredictions="roomPredictions" :updateStatus="updateStatus" />
                <ForecastChart v-else-if="sensorPredictions" :sensorPredictions="sensorPredictions" :updateStatus="updateStatus" />
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <p v-if="roomPredictions?.sensorData.predictions"><small>Last predictions fetched: {{ formatDateString(roomPredictions.timestamp) }}</small></p>
                <p v-if="sensorPredictions?.sensorData.predictions"><small>Last predictions fetched: {{ formatDateString(sensorPredictions.timestamp) }}</small></p> 
                <p v-if="roomData?.latestSensorData.timestamp"><small>Last updated: {{ formatDateString(roomData.latestSensorData.timestamp) }}</small></p>  
                <p v-if="sensorData?.latestSensorData.timestamp"><small>Last updated: {{ formatDateString(sensorData.latestSensorData.timestamp) }}</small></p> 
            </v-col>
        </v-row>
    </v-sheet>
</template>

<style scoped>
.room-card {
  position: absolute;
  bottom: 0;
  width: 100%;
}
</style>
