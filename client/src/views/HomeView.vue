<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import {io, Socket} from 'socket.io-client';

export default defineComponent({
    name: 'Home',
    components: { },
    setup() {
        const test = ref()
        let socket = ref<Socket | null>();

        async function ioConnect() {
            socket.value = io('http://localhost:8000');

            socket.value.on("mqttData", (mqttData) => {
                console.log("Received MQTT data:", mqttData)
            })
        }

        onMounted(() => {
            ioConnect();
        });

        onBeforeUnmount(() => {
            socket.value?.disconnect();
        });

        return { test, ioConnect }
    }
})
</script>

<template>
    <h1>Hello World</h1>
    <!-- <button @click="ioConnect()"></button> -->
</template>

<style scoped>
</style>