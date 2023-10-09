<script lang="ts">
import { defineComponent, inject, ref } from 'vue';
import type { RoomData } from '../types/RoomData';

export default defineComponent({
    name: 'Home',
    components: { },
    props: {
        roomData: Object as () => RoomData
    },
    setup() {
        const drawer = ref(true);
        const rail = ref(false);

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
                return "Unknown"; // Return NaN for non-numeric input
            }

            const numberString = number.toString(); // Convert the number to a string

            if (numberString.includes('.')) {
                return numberString; // Return unchanged if it already has a decimal point
            } else if (numberString.length > 3) {
                const integerPart = numberString.slice(0, -3); // Extract the integer part
                const decimalPart = numberString.slice(-3); // Extract the last three digits as decimal
                return `${integerPart}.${decimalPart}`;
            } else {
                return numberString; // Return unchanged if it's 3 digits or less
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

        function calculateAverageLightLevel(roomData: RoomData) {
            if (roomData?.latestSensorData) {
                return (roomData.latestSensorData.color_b + roomData.latestSensorData.color_c + roomData.latestSensorData.color_r + roomData.latestSensorData.color_g) / 4;
            }
        }
        
        return { drawer, rail, formatDateString, formatVoltageValue, getOccupancyStatus, getOccupancyStatusClass, calculateAverageLightLevel }
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
        <v-list-item prepend-icon="mdi-keyboard-f7" title="Floor 7" value="floor7" disabled></v-list-item>
        <v-list-item prepend-icon="mdi-keyboard-f10" title="Floor 10" value="floor10" disabled></v-list-item>
        <v-list-item prepend-icon="mdi-keyboard-f11" title="Floor 11" value="floor11"></v-list-item>
        <v-list-item prepend-icon="mdi-keyboard-f12" title="Floor 12" value="floor12" disabled></v-list-item>
        </v-list>

        <v-sheet class="room-card pa-3" :elevation="5" v-if="!rail && roomData" >
            <v-row>
                <v-col>
                    <h1>{{ roomData.name }}</h1>
                </v-col>
            </v-row>
            <v-row class="mt-0">
                <v-col>
                    <small>{{ roomData?.floor }}<sup>th</sup> Floor</small>
                </v-col>
                <v-col>
                    <small>{{ roomData?.latestSensorData.sensor }}</small>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-chip prepend-icon="mdi-account-multiple-outline" variant="text" :class="getOccupancyStatusClass(roomData?.colorCode)">
                        {{ getOccupancyStatus(roomData?.colorCode) }}
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Shows current room occupancy status.
                        </v-tooltip>
                    </v-chip>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-chip prepend-icon="mdi-temperature-celsius" variant="text">
                        {{  Math.floor(roomData?.latestSensorData.temperature / 100) }}°C
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Shows current room temperature. Displayed value might be higher than the actual room temperature due to packaging/charging.
                        </v-tooltip>
                    </v-chip>
                </v-col>
                <v-col>
                    <v-chip prepend-icon="mdi-water" variant="text">
                        {{ roomData?.latestSensorData.humidity }}%
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Shows current room humidity level.
                        </v-tooltip>
                    </v-chip>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-chip prepend-icon="mdi-molecule-co2" variant="text">
                        {{ roomData?.latestSensorData.eCO2 }}ppm
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Shows current CO2 level in the room.
                        </v-tooltip>
                    </v-chip>
                </v-col>
                <v-col>
                    <v-chip prepend-icon="mdi-gas-cylinder" variant="text">
                        {{ roomData?.latestSensorData.TVOC }}ppm
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Displays current VOC (Volatile Organic Compound) level. Please note that the displayed value might be influenced by various factors, including environmental conditions, and may not always represent the exact VOC concentration.
                        </v-tooltip>
                    </v-chip>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-chip prepend-icon="mdi-volume-high" variant="text">
                        {{ roomData?.latestSensorData.sound }}dB
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Shows current noise level (peak audio sensor amplitude over period).
                        </v-tooltip>
                    </v-chip>
                </v-col>
                <v-col>
                    <v-chip prepend-icon="mdi-lightbulb-on" variant="text">
                        {{ calculateAverageLightLevel(roomData) }}lux
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Displays the current light level in lux (illuminance). Represents the overall intensity of visible light in the environment
                        </v-tooltip>
                    </v-chip>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <v-chip prepend-icon="mdi-signal" variant="text">
                        {{ roomData?.latestSensorData.rssi }}dBm
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Displays current RSSI signal strength to Bluetooth IoT gateway.
                        </v-tooltip>
                    </v-chip>
                </v-col>
                <v-col>
                    <v-chip prepend-icon="mdi-battery-charging" variant="text">
                        {{ formatVoltageValue(roomData?.latestSensorData.voltage) }}V
                        <v-tooltip activator="parent" location="top" max-width="300px">
                            Displays current voltage level (V) of the onboard battery. Sensor is recharged when beneath certain level.
                        </v-tooltip>
                    </v-chip>
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <p><small>Last updated: {{ formatDateString(roomData.latestSensorData.timestamp) }}</small></p>                    
                </v-col>
            </v-row>
        </v-sheet>
    </v-navigation-drawer>
</template>

<style scoped>
.room-card {
  position: absolute;
  bottom: 0;
  width: 100%;
}

.text-green {
  color: green;
}

.text-red {
  color: red;
}

.text-orange {
  color: orange;
}

.text-grey {
  color: grey;
}
</style>