<script lang="ts">
import { defineComponent, inject, ref } from 'vue';
import type { RoomData } from '../types/RoomData';
import SensorDetails from './SensorDetails.vue';
import MobileSensorDetails from './MobileSensorDetails.vue';

export default defineComponent({
    name: 'MobileNavBar',
    components: { MobileSensorDetails },
    emits: ["closeMobileDialog"],
    props: {
        roomData: Object as () => RoomData,
        mobileDialog: Boolean
    },
    setup() {
        const menuVisible = ref(false);
        
        return { menuVisible } 
    }
})
</script>

<template>
    <v-app-bar>
        <router-link to="/" class="ml-5">
            <v-avatar image="https://assets.vu.nl/d8b6f1f5-816c-005b-1dc1-e363dd7ce9a5/5bbfe2a6-ef6a-4dd9-8bdf-6250e834266e/VU_social_avatar_wit.png"></v-avatar>
        </router-link>
        <v-app-bar-title>NU Gebouw</v-app-bar-title>
        
        
        <v-dialog v-model="mobileDialog" fullscreen :scrim="false" transition="dialog-bottom-transition" class="d-lg-none">
            <MobileSensorDetails :roomData="roomData" @closeMobileDialog="$emit('closeMobileDialog')"/>
        </v-dialog>
    </v-app-bar>
    


</template>

<style scoped>
</style>