<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import {io, Socket} from 'socket.io-client';
import axios from 'axios'
import Konva from 'konva';

import type { RoomData } from '@/types/RoomData'
import type { MQTTSensorData } from '@/types/MQTTSensorData';


export default defineComponent({
    name: 'Home',
    components: {},
    emits: ["showRoomData"],
    setup() {
        const counter = ref(0);

        const histSensorData = ref<RoomData[]>([]);
        let socket = ref<Socket | null>();

        async function fetchHistoricSensorData() {
            axios.get('/api/sensordata/11')
                .then(res => {
                    if (res.status == 200 || res.status == 304) {
                        // console.log(`Fetched historic sensor data ${JSON.stringify(res.data, null, 2)}`)
                        histSensorData.value = res.data;
                    } 
                })
                .catch(err => {
                    if (err) {
                        console.log(`Failed to fetch historic sensor data ${err}`)
                    }
                })
        }

        async function ioConnect() {
            socket.value = io('http://localhost:8000');

            socket.value.on("mqttData", (mqttData: MQTTSensorData) => {
                console.log("Received MQTT data:", mqttData);
                const roomToUpdate = histSensorData.value.find((room) => room.name === mqttData.room);
                    if (roomToUpdate) {
                        updateRoomData(mqttData);
                    }
            })
        }

        const updateRoomData = (mqttData: MQTTSensorData) => {
            const roomIndex = histSensorData.value.findIndex((r) => r.name === mqttData.room);
            if (roomIndex !== -1) {
                histSensorData.value[roomIndex].colorCode = mqttData.colorCode;
                histSensorData.value[roomIndex].latestSensorData.TVOC = mqttData.TVOC;
                histSensorData.value[roomIndex].latestSensorData.sensor = mqttData.sensor;
                histSensorData.value[roomIndex].latestSensorData.eCO2 = mqttData.eCO2;
                histSensorData.value[roomIndex].latestSensorData.pressure = mqttData.pressure;
                histSensorData.value[roomIndex].latestSensorData.temperature = mqttData.temperature;
                histSensorData.value[roomIndex].latestSensorData.humidity = mqttData.humidity;
                histSensorData.value[roomIndex].latestSensorData.voltage = mqttData.voltage;
                histSensorData.value[roomIndex].latestSensorData.sound = mqttData.sound;
                histSensorData.value[roomIndex].latestSensorData.rssi = mqttData.rssi;
                histSensorData.value[roomIndex].latestSensorData.color_b = mqttData.color_b;
                histSensorData.value[roomIndex].latestSensorData.color_c = mqttData.color_c;
                histSensorData.value[roomIndex].latestSensorData.color_g = mqttData.color_g;
                histSensorData.value[roomIndex].latestSensorData.color_r = mqttData.color_r;
                histSensorData.value[roomIndex].latestSensorData.timestamp = mqttData.timestamp;
            }
        };

        // const stage = ref<Konva.Stage>();
        // const layer = ref<Konva.Layer>();

        const canvasWrapper = ref<HTMLDivElement | null>(null);
        const image = new Image();
        const aspectRatio = ref(0);
        const imageOriginalHeight = ref(0);
        const imageOriginalWidth = ref(0);
        const zoomFactor = ref(1.4);

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

        onMounted(async () => {
            await fetchHistoricSensorData()
            await ioConnect();

            resizeCanvas();

            image.src = '/floor11.svg';
            image.onload = () => {
                aspectRatio.value = image.height / image.width;
                imageConfig.value.image = image;

                imageOriginalHeight.value = image.height;
                imageOriginalWidth.value = image.width;

                resizeImage();
            };

            window.addEventListener('resize', () => {
                resizeCanvas();
                resizeImage();
            });
        });

        onBeforeUnmount(() => {
            socket.value?.disconnect();
        });

        return { 
            stageSize, 
            imageConfig, 
            histSensorData, 
            canvasWrapper, 
            resizeCanvas, 
            calculateRoomX, 
            calculateRoomY, 
            calculateRoomWidth, 
            calculateRoomHeight, 
            onZoom, 
            highlightRoom,
            counter
        }
    }
})
</script>

<template>
    <div ref="canvasWrapper" style="height: 100vh; width: 100%;" @wheel="onZoom">
        <v-stage ref="stage" :config="stageSize">
            <v-layer ref="layer">
                <v-image :config="imageConfig"/>
                <v-rect
                    @mouseover="highlightRoom(room, true)"
                    @mouseout="highlightRoom(room, false)"
                    @click="$emit('showRoomData', room)"
                    v-for="(room, index) in histSensorData"
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
            </v-layer>
        </v-stage>
    </div>

</template>

<style scoped>
</style>