<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
    name: 'Home',
    components: { },
    setup() {
        const test = ref();
        const drawer = ref(true);
        const rail = ref(false);
        
        return { test, drawer, rail }
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
    </v-navigation-drawer>
</template>

<style scoped>
</style>