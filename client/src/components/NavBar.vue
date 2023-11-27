<script lang="ts">
import { defineComponent, inject, ref } from 'vue';
import type { RoomData } from '../types/RoomData';
import SensorDetails from './SensorDetails.vue';
import type { ForecastData } from '@/types/ForecastData';

export default defineComponent({
    name: 'Home',
    components: { SensorDetails },
    props: {
        roomData: Object as () => RoomData,
        roomPredictions: Object as () => ForecastData
    },
    setup() {
        const drawer = ref(true);
        const rail = ref(false);

        const menuVisible = ref(false);

        const toggleMenu = () => {
            menuVisible.value = !menuVisible.value;
        };

        const items = ref();
        
        return { drawer, rail, toggleMenu, items}
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
            <!-- <v-list-item prepend-icon="mdi-keyboard-f7" title="Floor 7" value="floor7" disabled></v-list-item>
            <v-list-item prepend-icon="mdi-keyboard-f10" title="Floor 10" value="floor10" disabled></v-list-item>
            <v-list-item prepend-icon="mdi-keyboard-f11" title="Floor 11" value="floor11"></v-list-item>
            <v-list-item prepend-icon="mdi-keyboard-f12" title="Floor 12" value="floor12" disabled></v-list-item> -->
            <v-list-item title="Floor 7" value="floor7" disabled></v-list-item>
            <v-list-item title="Floor 10" value="floor10" disabled></v-list-item>
            <v-list-item title="Floor 11" value="floor11"></v-list-item>
            <v-list-item title="Floor 12" value="floor12" disabled></v-list-item>
        </v-list>

        <SensorDetails class="scrollable" v-if="!rail && roomData" :roomData="roomData" :roomPredictions="roomPredictions" />
    </v-navigation-drawer>
</template>

<style scoped>
.scrollable {
    overflow-y: scroll;
    max-height: 70%;
}

::-webkit-scrollbar {
    width: 10px;
    display: block;
}
</style>