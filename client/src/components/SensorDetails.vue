<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import ForecastChart from './ForecastChart.vue'
import type { RoomData } from '../types/RoomData';
import type { SensorData } from '../types/SensorData';
import type { ForecastData } from '../types/ForecastData';
import type { ModelType } from '../types/ModelType';

export default defineComponent({
    name: 'SensorDetails',
    components: { ForecastChart },
    props: {
        roomData: Object as () => RoomData,
        sensorData: Object as () => SensorData,
        roomPredictions: Object as () => ForecastData,
        sensorPredictions: Object as () => ForecastData,
        updateStatus: Boolean
    },
    setup(props, { emit }) {
        const models = ref<ModelType[]>([
            { title: 'LSTM',    value: 'LSTM'},
            { title: 'GRU',     value: 'GRU'},
            { title: '1D CNN',  value: 'CNN'},
        ]);
        const selectedModel = ref<ModelType>(models.value[0]);

        watch(() => selectedModel.value, () => {
            emit("updatePredictionModel", selectedModel.value)
        });

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
                return undefined;
            }

            const numberString = number.toString();

            if (numberString.includes('.')) {
                return parseFloat(numberString);
            } else if (numberString.length > 3) {
                const integerPart = numberString.slice(0, -3);
                const decimalPart = numberString.slice(-3);

                return parseFloat(`${integerPart}.${decimalPart}`);
            } else {
                return parseFloat(numberString);
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
                    return ' Live data not available';
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

        function formatMetricString(val: number | undefined, stat: string) {
            if (val == undefined || isNaN(val) || !val.toString()) {
                return 'Unavail.'
            }

            let label = ''
            switch (stat) {
                case 'temp':
                    label = '°C';
                    break;
                case 'humidity':
                    label = '%'
                    break;
                case 'co2':
                    label = 'ppm'
                    break;
                case 'tvoc':
                    label = 'ppm'
                    break;
                case 'light':
                    label = 'lux'
                    break;
                case 'sound':
                    label = 'dBm'
                    break;
                case 'rssi':
                    label = 'dBm'
                    break;
                case 'voltage':
                    label = 'V'
                    break;
                default:
                    label = '';
                    break;
            }
            return val + label;
        }

      return { 
        models,
        selectedModel,

        formatMetricString, 
        formatDateString, 
        formatVoltageValue, 
        getOccupancyStatus, 
        getOccupancyStatusClass, 
        calculateRoomAverageLightLevel, 
        calculateSensorAverageLightLevel};
    }
})
</script>

<template>
    <v-sheet class="room-card pa-3" :elevation="5" v-if="roomData || sensorData">
        <v-row>
            <v-col>
                <h1 v-if="roomData">{{ roomData.name }}</h1>
                <h1 v-if="sensorData">{{ sensorData.room }}</h1>
            </v-col>
        </v-row>
        <v-row class="mt-0">
            <v-col>
                <small v-if="roomData">{{ roomData?.floor }}<sup>th</sup> Floor</small>
                <small v-if="sensorData">{{ sensorData?.floor }}<sup>th</sup> Floor</small>
            </v-col>
            <v-col>
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
                    {{  formatMetricString(Math.floor(roomData?.latestSensorData.temperature / 100), "temp") }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room temperature. Displayed value might be higher than the actual room temperature due to packaging/charging.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-temperature-celsius" variant="text">
                    {{  formatMetricString(Math.floor(sensorData?.latestSensorData.temperature / 100), "temp") }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room temperature. Displayed value might be higher than the actual room temperature due to packaging/charging.
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-water" variant="text">
                    {{ formatMetricString(roomData?.latestSensorData.humidity, 'humidity') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room humidity level.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-water" variant="text">
                    {{ formatMetricString(sensorData?.latestSensorData.humidity, 'humidity') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current room humidity level.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-molecule-co2" variant="text">
                    {{ formatMetricString(roomData?.latestSensorData.eCO2, 'co2') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current CO2 level in the room.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-molecule-co2" variant="text">
                    {{ formatMetricString(sensorData?.latestSensorData.eCO2, 'co2') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current CO2 level in the room.
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-gas-cylinder" variant="text">
                    {{ formatMetricString(roomData?.latestSensorData.TVOC, 'tvoc') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current VOC (Volatile Organic Compound) level. Please note that the displayed value might be influenced by various factors, including environmental conditions, and may not always represent the exact VOC concentration.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-gas-cylinder" variant="text">
                    {{ formatMetricString(sensorData?.latestSensorData.TVOC, 'tvoc') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current VOC (Volatile Organic Compound) level. Please note that the displayed value might be influenced by various factors, including environmental conditions, and may not always represent the exact VOC concentration.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-volume-high" variant="text">
                    {{ formatMetricString(roomData?.latestSensorData.sound, 'sound') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current noise level (peak audio sensor amplitude over period).
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-volume-high" variant="text">
                    {{ formatMetricString(sensorData?.latestSensorData.sound, 'sound') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Shows current noise level (peak audio sensor amplitude over period).
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-lightbulb-on" variant="text">
                    {{ formatMetricString(calculateRoomAverageLightLevel(roomData), 'light') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays the current light level in lux (illuminance). Represents the overall intensity of visible light in the environment
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-lightbulb-on" variant="text">
                    {{ formatMetricString(calculateSensorAverageLightLevel(sensorData), 'light') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays the current light level in lux (illuminance). Represents the overall intensity of visible light in the environment
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-signal" variant="text">
                    {{ formatMetricString(roomData?.latestSensorData.rssi, 'rssi') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current RSSI signal strength to Bluetooth IoT gateway.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-signal" variant="text">
                    {{ formatMetricString(sensorData?.latestSensorData.rssi, 'rssi') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current RSSI signal strength to Bluetooth IoT gateway.
                    </v-tooltip>
                </v-chip>
            </v-col>
            <v-col>
                <v-chip v-if="roomData" prepend-icon="mdi-battery-charging" variant="text">
                    {{ formatMetricString(formatVoltageValue(roomData?.latestSensorData.voltage), 'voltage') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current voltage level (V) of the onboard battery. Sensor is recharged when beneath certain level.
                    </v-tooltip>
                </v-chip>
                <v-chip v-if="sensorData" prepend-icon="mdi-battery-charging" variant="text">
                    {{ formatMetricString(formatVoltageValue(sensorData?.latestSensorData.voltage), 'voltage') }}
                    <v-tooltip activator="parent" location="top" max-width="300px">
                        Displays current voltage level (V) of the onboard battery. Sensor is recharged when beneath certain level.
                    </v-tooltip>
                </v-chip>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-select
                    v-model="selectedModel"
                    :items="models"
                    label="Prediction Model"
                    variant="underlined"
                    density="compact"
                    :hide-details=true
                ></v-select>
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
