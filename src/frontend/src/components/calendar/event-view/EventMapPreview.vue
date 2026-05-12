<script setup lang="ts">
import GoogleMapsEmbed from './GoogleMapsEmbed.vue';

defineProps<{
    location?: string;
    lat: number;
    lon: number;
}>();

const emit = defineEmits<{
    (e: 'open-map'): void;
}>();
</script>

<template>
    <div
        class="relative h-[140px] w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-800/50 shadow-lg sm:h-[240px]"
        @click="emit('open-map')"
    >
        <GoogleMapsEmbed :query="location" :lat="lat" :lon="lon" :zoom="14" />
    </div>
</template>
