<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watchEffect, watch } from 'vue';
import {io, Socket} from 'socket.io-client';
import axios from 'axios'
import Konva from 'konva';

import type { RoomData } from '@/types/RoomData'
import type { SensorData } from '@/types/SensorData'
import type { MQTTSensorData } from '@/types/MQTTSensorData';
import type { ForecastData } from '@/types/ForecastData';

export default defineComponent({
    name: 'Home',
    components: {},
    emits: ["showRoomData", "showSensorData", "showUpdateSuccess"],
    props: {
        mode: Boolean,
        rail: Boolean,
        updateForecasts: Boolean,
        selectedFloor: Number,
        selectedPredictionModel: String,
    },
    setup(props, { emit }) {
        const histRoomData = ref<RoomData[]>([]);
        const histSensorData = ref<SensorData[]>([]);
        const forecastRoomData = ref<ForecastData[]>([]);
        const forecastSensorData = ref<ForecastData[]>([]);
        
        const selectedRoomDataIndex = ref<number | undefined>(undefined);
        const selectedSensorDataIndex = ref<number | undefined>(undefined);
        const selectedRoomForecastDataIndex = ref<number | undefined>(undefined);
        const selectedSensorForecastDataIndex = ref<number | undefined>(undefined);

        let socket = ref<Socket | null>();

        async function fetchRoomData(floor: number | undefined) {
            await axios.get(`/api/roomdata/${floor}`)
                .then(res => {
                    if (res.status == 200 || res.status == 304) {
                        // console.log(`Fetched historic room data ${JSON.stringify(res.data, null, 2)}`)
                        histRoomData.value = res.data;
                        dataLoaded.value = true;
                    } 
                })
                .catch(err => {
                    if (err) {
                        console.log(`Failed to fetch historic room data ${err}`)
                    }
                })
        }

        async function fetchSensorData(floor: number | undefined) {
            await axios.get(`/api/sensordata/${floor}`)
                .then(res => {
                    if (res.status == 200 || res.status == 304) {
                        // console.log(`Fetched historic sensor data ${JSON.stringify(res.data, null, 2)}`)
                        histSensorData.value = res.data;
                        dataLoaded.value = true;
                    } 
                })
                .catch(err => {
                    if (err) {
                        console.log(`Failed to fetch historic sensor data ${err}`)
                    }
                })
        }

        async function fetchRoomPredictions(model: string | undefined) {
            await axios.get(`/api/forecast/rooms/${model}`)
                .then(res => {
                    if (res.status == 200 || res.status == 304) {
                        // console.log(`Fetched predictions ${JSON.stringify(res.data, null, 2)}`)
                        forecastRoomData.value = res.data;
                    } 
                })
                .catch(err => {
                    if (err) {
                        console.log(`Failed to fetch predictions ${err}`)
                    }
                })
        }

        async function fetchSensorPredictions(model: string | undefined) {
            await axios.get(`/api/forecast/sensors/${model}`)
                .then(res => {
                    if (res.status == 200 || res.status == 304) {
                        // console.log(`Fetched predictions ${JSON.stringify(res.data, null, 2)}`)
                        forecastSensorData.value = res.data;
                    } 
                })
                .catch(err => {
                    if (err) {
                        console.log(`Failed to fetch predictions ${err}`)
                    }
                })
        }

        async function requestForecastsUpdate() {
            await axios.get('/api/forecast/update')
                .then(async (res) => {
                    if (res.status == 200) {
                        await fetchRoomPredictions(props.selectedPredictionModel);
                        await fetchSensorPredictions(props.selectedPredictionModel);
                        emit('showUpdateSuccess')
                        showDataUIHandler();
                    } 
                })
                .catch(err => {
                    if (err) {
                        console.log(`Failed to fetch predictions ${err}`)
                    }
                })
        }

        async function ioConnect() {
            socket.value = io('http://localhost:8000');

            socket.value.on("mqttData", (mqttData: MQTTSensorData) => {
                const roomToUpdate = histRoomData.value.find((room) => room.name === mqttData.room);
                const sensorToUpdate = histSensorData.value.find((sensor) => sensor.name === mqttData.sensor);
                if (roomToUpdate) {
                    updateRoomData(mqttData);
                }
                if (sensorToUpdate) {
                    updateSensorData(mqttData);
                }
            })
        }

        const updateRoomData = (mqttData: MQTTSensorData) => {
            const roomIndex = histRoomData.value.findIndex((r) => r.name === mqttData.room);
            if (roomIndex !== -1) {
                histRoomData.value[roomIndex].colorCode = mqttData.colorCode;
                histRoomData.value[roomIndex].latestSensorData.TVOC = mqttData.TVOC;
                histRoomData.value[roomIndex].latestSensorData.sensor = mqttData.sensor;
                histRoomData.value[roomIndex].latestSensorData.eCO2 = mqttData.eCO2;
                histRoomData.value[roomIndex].latestSensorData.pressure = mqttData.pressure;
                histRoomData.value[roomIndex].latestSensorData.temperature = mqttData.temperature;
                histRoomData.value[roomIndex].latestSensorData.humidity = mqttData.humidity;
                histRoomData.value[roomIndex].latestSensorData.voltage = mqttData.voltage;
                histRoomData.value[roomIndex].latestSensorData.sound = mqttData.sound;
                histRoomData.value[roomIndex].latestSensorData.rssi = mqttData.rssi;
                histRoomData.value[roomIndex].latestSensorData.color_b = mqttData.color_b;
                histRoomData.value[roomIndex].latestSensorData.color_c = mqttData.color_c;
                histRoomData.value[roomIndex].latestSensorData.color_g = mqttData.color_g;
                histRoomData.value[roomIndex].latestSensorData.color_r = mqttData.color_r;
                histRoomData.value[roomIndex].latestSensorData.timestamp = mqttData.timestamp;
            }
        };

        const updateSensorData = (mqttData: MQTTSensorData) => {
            const sensorIndex = histSensorData.value.findIndex((sensor) => sensor.name === mqttData.sensor);

            if (sensorIndex !== -1) {
                histSensorData.value[sensorIndex].colorCode = mqttData.colorCode;
                histSensorData.value[sensorIndex].latestSensorData.TVOC = mqttData.TVOC;
                histSensorData.value[sensorIndex].latestSensorData.eCO2 = mqttData.eCO2;
                histSensorData.value[sensorIndex].latestSensorData.pressure = mqttData.pressure;
                histSensorData.value[sensorIndex].latestSensorData.temperature = mqttData.temperature;
                histSensorData.value[sensorIndex].latestSensorData.humidity = mqttData.humidity;
                histSensorData.value[sensorIndex].latestSensorData.voltage = mqttData.voltage;
                histSensorData.value[sensorIndex].latestSensorData.sound = mqttData.sound;
                histSensorData.value[sensorIndex].latestSensorData.rssi = mqttData.rssi;
                histSensorData.value[sensorIndex].latestSensorData.color_b = mqttData.color_b;
                histSensorData.value[sensorIndex].latestSensorData.color_c = mqttData.color_c;
                histSensorData.value[sensorIndex].latestSensorData.color_g = mqttData.color_g;
                histSensorData.value[sensorIndex].latestSensorData.color_r = mqttData.color_r;
                histSensorData.value[sensorIndex].latestSensorData.timestamp = mqttData.timestamp;
            }
        }

        const getPredictionsByRoom = (room: RoomData) => {
            const roomIndex = forecastRoomData.value.findIndex((r) => r.name === room.name);
            if (roomIndex !== -1) {
                return forecastRoomData.value[roomIndex];
            }
        }

        const getPredictionsBySensor = (sensor: SensorData) => {
            const sensorIndex = forecastSensorData.value.findIndex((s) => s.sensorData.sensor === sensor.name);
            if (sensorIndex !== -1) {
                return forecastSensorData.value[sensorIndex];
            }
        }

        const getPredictionsIndexByRoom = (room: RoomData) => {
            return forecastRoomData.value.findIndex((r) => r.name === room.name);
        }

        const getPredictionsIndexBySensor = (sensor: SensorData) => {
            return forecastSensorData.value.findIndex((s) => s.sensorData.sensor === sensor.name);
        }

        const saveSelectedRoomDataIndex = (roomIndex: number) => {
            selectedRoomDataIndex.value = roomIndex;
            selectedRoomForecastDataIndex.value = getPredictionsIndexByRoom(histRoomData.value[roomIndex]);
            selectedSensorDataIndex.value = undefined;
            selectedSensorForecastDataIndex.value = undefined;
        }

        const saveSelectedSensorDataIndex = (sensorIndex: number) => {
            selectedSensorDataIndex.value = sensorIndex;
            selectedSensorForecastDataIndex.value = getPredictionsIndexBySensor(histSensorData.value[sensorIndex]);
            selectedRoomDataIndex.value = undefined;
            selectedRoomForecastDataIndex.value = undefined;
        }

        const showDataUIHandler = () => {
            if (selectedRoomDataIndex.value != undefined && selectedRoomForecastDataIndex.value != undefined) {
                emit('showRoomData', histRoomData.value[selectedRoomDataIndex.value], forecastRoomData.value[selectedRoomForecastDataIndex.value]);
                emit('showSensorData', undefined, undefined); 
            }

            if (selectedSensorDataIndex.value != undefined && selectedSensorForecastDataIndex.value != undefined) {
                emit('showSensorData', histSensorData.value[selectedSensorDataIndex.value], forecastSensorData.value[selectedSensorForecastDataIndex.value]); 
                emit('showRoomData', undefined, undefined);
            }
        }

        const canvasWrapper = ref<HTMLDivElement | null>(null);
        const image = new Image();
        const aspectRatio = ref(0);
        const imageOriginalHeight = ref(0);
        const imageOriginalWidth = ref(0);
        const zoomFactor = ref(1.4);
        const imageLoaded = ref<boolean>(false);
        const dataLoaded = ref<boolean>(false);

        const stageSize = ref({
            width: 0,
            height: 0,
        });

        const imageConfig = ref({
            image: null as HTMLImageElement | null,
            x: 0,
            y: 0
        });
        
        const resizeCanvas = () => {
            stageSize.value.height = canvasWrapper.value!.clientHeight;
            stageSize.value.width = canvasWrapper.value!.clientWidth;
        }

        const resizeImage = () => {
            image.width = stageSize.value.width / zoomFactor.value;
            image.height = image.width * aspectRatio.value;
            imageConfig.value.x = (stageSize.value.width / 2) - (image.width / 2);
            imageConfig.value.y = (stageSize.value.height / 2) - (image.height / 2);
        }

        const calculateRoomX = (room: RoomData) => {
            if (imageConfig.value.image) {
                return ((room.x_coord * (imageConfig.value.image!.width / imageOriginalWidth.value)) + imageConfig.value.x);
            } else {
                return room.x_coord;
            }
        };

        const calculateRoomY = (room: RoomData) => {
            if (imageConfig.value.image) {
                return ((room.y_coord * (imageConfig.value.image!.height / imageOriginalHeight.value)) + imageConfig.value.y);
            } else {
                return room.y_coord;
            }

        };

        const calculateRoomWidth = (room: RoomData) => {
            if (imageConfig.value.image) {
                return (room.width * imageConfig.value.image!.width) / imageOriginalWidth.value;
            } else {
                return room.width;
            }
            
        };

        const calculateRoomHeight = (room: RoomData) => {
            if (imageConfig.value.image) {
                return (room.height * imageConfig.value.image!.height) / imageOriginalHeight.value;
            } else {
                return room.height;
            }
        };

        const calculateSensorX = (sensor: SensorData) => {
            if (imageConfig.value.image) {
                return ((sensor.x_coord * (imageConfig.value.image!.width / imageOriginalWidth.value)) + imageConfig.value.x);
            } else {
                return sensor.x_coord;
            }
        };

        const calculateSensorY = (sensor: SensorData) => {
            if (imageConfig.value.image) {
                return ((sensor.y_coord * (imageConfig.value.image!.height / imageOriginalHeight.value)) + imageConfig.value.y);
            } else {
                return sensor.y_coord;
            }

        };

        const calculateSensorWidth = (sensor: SensorData) => {
            if (imageConfig.value.image) {
                return (sensor.width * imageConfig.value.image!.width) / imageOriginalWidth.value;
            } else {
                return sensor.width;
            }
            
        };

        const calculateSensorHeight = (sensor: SensorData) => {
            if (imageConfig.value.image) {
                return (sensor.height * imageConfig.value.image!.height) / imageOriginalHeight.value;
            } else {
                return sensor.height;
            }
        };

        const onZoom = (event: WheelEvent) => {
            if (event.deltaY < 0) {
                zoomFactor.value = Math.max(1, zoomFactor.value - 0.1);
            } else {
                zoomFactor.value = Math.min(2, zoomFactor.value + 0.1);
            }
            resizeImage();
        };

        const highlightRoom = (room: RoomData, isHighlight: boolean) => {
            room.isHighlighted = isHighlight;
        };

        const highlightSensor = (sensor: SensorData, isHighlight: boolean) => {
            sensor.isHighlighted = isHighlight;
        };

        onMounted(async () => {
            await fetchRoomData(props.selectedFloor);
            await fetchSensorData(props.selectedFloor);
            await fetchRoomPredictions(props.selectedPredictionModel);
            await fetchSensorPredictions(props.selectedPredictionModel);
            await ioConnect();

            resizeCanvas();

            image.onload = () => {
                aspectRatio.value = image.height / image.width;
                imageConfig.value.image = image;

                imageOriginalHeight.value = image.height;
                imageOriginalWidth.value = image.width;

                resizeImage();
                imageLoaded.value = true;
            };
            image.src = `/floor${props.selectedFloor}.svg`;

            window.addEventListener('resize', () => {
                resizeCanvas();
                resizeImage();
            });
        });

        onBeforeUnmount(() => {
            socket.value?.disconnect();
        });

        watch(() => props.selectedFloor, () => {
            imageLoaded.value = false;
            dataLoaded.value = false;
            image.onload = async () => {
                aspectRatio.value = image.height / image.width;
                imageConfig.value.image = image;

                // imageOriginalHeight.value = image.height;
                // imageOriginalWidth.value = image.width;

                resizeImage();
                await fetchRoomData(props.selectedFloor);
                await fetchSensorData(props.selectedFloor);
                imageLoaded.value = true;
            };
            image.src = `/floor${props.selectedFloor}.svg`;

        })

        watch(() => props.selectedPredictionModel, async () => {
            await fetchRoomPredictions(props.selectedPredictionModel);
            await fetchSensorPredictions(props.selectedPredictionModel);
            showDataUIHandler();
        });

        watch(() => props.updateForecasts, async () => {
            await requestForecastsUpdate();
        });

        watch(() => props.rail, async () => {
            
            if (!props.rail) {
                showDataUIHandler();
            }

        });

        return { 
            stageSize, 
            imageConfig, 
            histRoomData,
            histSensorData, 
            canvasWrapper, 
            imageLoaded,
            dataLoaded,
            showDataUIHandler,
            saveSelectedRoomDataIndex,
            saveSelectedSensorDataIndex,
            resizeCanvas, 
            calculateRoomX, 
            calculateRoomY, 
            calculateRoomWidth, 
            calculateRoomHeight,
            calculateSensorX, 
            calculateSensorY, 
            calculateSensorWidth, 
            calculateSensorHeight, 
            onZoom, 
            highlightRoom,
            highlightSensor,
            getPredictionsByRoom,
            getPredictionsBySensor,
        }
    }
})
</script>

<template>
    <div ref="canvasWrapper" style="height: 100vh; width: 100%; display: flex; justify-content: center; align-items: center;" @wheel="onZoom">
        <v-stage v-if="imageLoaded && dataLoaded" ref="stage" :config="stageSize" >
            <v-layer ref="layer">
                <v-image :config="imageConfig"/>
                <v-rect
                    v-if="!mode && imageLoaded && dataLoaded"
                    @mouseover="highlightRoom(room, true)"
                    @mouseout="highlightRoom(room, false)"
                    @touchstart="highlightRoom(room, true)"
                    @touchend="highlightRoom(room, false)"
                    @click="
                        saveSelectedRoomDataIndex(index);
                        showDataUIHandler();"
                    @tap="
                        saveSelectedRoomDataIndex(index);
                        showDataUIHandler();"
                    v-for="(room, index) in histRoomData"
                    :key="index"
                    :config="{
                        x: calculateRoomX(room),
                        y: calculateRoomY(room),
                        width: calculateRoomWidth(room),
                        height: calculateRoomHeight(room),
                        fill: room.colorCode,
                        opacity: room.isHighlighted ? 0.7 : 0.5,
                    }"
                />
                <v-rect
                    v-if="mode && imageLoaded && dataLoaded"
                    @mouseover="highlightSensor(sensor, true)"
                    @mouseout="highlightSensor(sensor, false)"
                    @touchstart="highlightSensor(sensor, true)"
                    @touchend="highlightSensor(sensor, false)"
                    @click="
                        saveSelectedSensorDataIndex(index);
                        showDataUIHandler();"
                    @tap="
                        saveSelectedSensorDataIndex(index);
                        showDataUIHandler()"
                    v-for="(sensor, index) in histSensorData"
                    :key="index"
                    :config="{
                        x: calculateSensorX(sensor),
                        y: calculateSensorY(sensor),
                        width: calculateSensorWidth(sensor),
                        height: calculateSensorHeight(sensor),
                        fill: sensor.colorCode,
                        opacity: sensor.isHighlighted ? 0.7 : 0.5,
                        stroke: 'black',
                        strokeWidth: 1
                    }"
                />
            </v-layer>
        </v-stage>
        <v-progress-circular v-else indeterminate color="blue-lighten-3" size="50"></v-progress-circular>
    </div>
</template>

<style scoped>
</style>