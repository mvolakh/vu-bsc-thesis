<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, toRefs, watchEffect } from 'vue';
import {io, Socket} from 'socket.io-client';
import axios from 'axios'
import Konva from 'konva';

import type { RoomData } from '@/types/RoomData'


export default defineComponent({
    name: 'Home',
    components: {},
    setup() {
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

            socket.value.on("mqttData", (mqttData) => {
                console.log("Received MQTT data:", mqttData)
            })
        }

        // const stage = ref<Konva.Stage>();
        // const layer = ref<Konva.Layer>();

        const canvasWrapper = ref<HTMLDivElement | null>(null);

        const stageSize = ref({
            width: 0,
            height: 0,
        });

        const imageConfig = ref({
            image: null as HTMLImageElement | null,
            x: 10,
            y: 10
        });
        
        const resizeCanvas = () => {
            // debugger
            stageSize.value.height = canvasWrapper.value!.clientHeight;
            stageSize.value.width = canvasWrapper.value!.clientWidth;
        }

        onMounted(async () => {
            await fetchHistoricSensorData()
            await ioConnect();

            resizeCanvas();

            const image = new Image();
            image.src = '/floor11.svg';
            image.onload = () => {
                const aspectRatio = image.height / image.width;
                image.width = stageSize.value.width;
                image.height = image.width * aspectRatio;
                imageConfig.value.image = image;
                imageConfig.value.x = (stageSize.value.width / 2) - (image.width / 2);
                imageConfig.value.y = (stageSize.value.height / 2) - (image.height / 2);
            };
        });

        watchEffect(() => {
            if (canvasWrapper.value) {
                resizeCanvas();
            }
        })

        onBeforeUnmount(() => {
            socket.value?.disconnect();
        });

        return { stageSize, imageConfig, histSensorData, canvasWrapper, resizeCanvas }
    }
})
</script>

<template>
    <div ref="canvasWrapper" style="height: 100vh; width: 100%;">
        <v-stage ref="stage" :config="stageSize">
            <v-layer ref="layer">
                <v-image :config="imageConfig"/>
                <v-rect"
                    v-for="(room, index) in histSensorData"
                    :key="index"
                    :config="{
                        x: room.x_coord,
                        y: room.y_coord,
                        width: room.width,
                        height: room.height,
                        fill: room.colorCode,
                        opacity: 0.5,
                    }"
                />
            </v-layer>
        </v-stage>
    </div>

</template>

<style scoped>
</style>