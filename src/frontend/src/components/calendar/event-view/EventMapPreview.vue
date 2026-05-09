<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const props = defineProps<{
    lat: number;
    lon: number;
    color?: string;
}>();

const emit = defineEmits<{
    (e: 'open-map'): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: maplibregl.Map | null = null;
let marker: maplibregl.Marker | null = null;

const initMap = () => {
    if (!mapContainer.value) return;

    map = new maplibregl.Map({
        container: mapContainer.value,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [props.lon, props.lat],
        zoom: 14,
        interactive: false,
        attributionControl: false
    });

    // Handle missing images in the style (like 'wood-pattern')
    map.on('styleimagemissing', (e) => {
        const id = e.id;
        const width = 1;
        const height = 1;
        const data = new Uint8Array(width * height * 4);
        map?.addImage(id, { width, height, data });
    });

    marker = new maplibregl.Marker({
        color: props.color || '#3b82f6'
    })
        .setLngLat([props.lon, props.lat])
        .addTo(map);
};

onMounted(() => {
    initMap();
});

onUnmounted(() => {
    map?.remove();
});

watch(
    () => [props.lat, props.lon],
    ([newLat, newLon]) => {
        if (map) {
            map.setCenter([newLon, newLat]);
            marker?.setLngLat([newLon, newLat]);
        }
    }
);

watch(
    () => props.color,
    (newColor) => {
        if (marker) {
            marker.remove();
            marker = new maplibregl.Marker({
                color: newColor || '#3b82f6'
            })
                .setLngLat([props.lon, props.lat])
                .addTo(map!);
        }
    }
);
</script>

<template>
    <div
        class="relative h-[140px] w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-800/50 shadow-lg"
        @click="emit('open-map')"
    >
        <div ref="mapContainer" class="h-full w-full"></div>
        <!-- Attribution -->
        <div class="pointer-events-none absolute right-2 bottom-1">
            <span class="text-[8px] font-medium text-zinc-500 uppercase opacity-50">© OpenFreeMap</span>
        </div>
    </div>
</template>

<style scoped>
:deep(.maplibregl-canvas) {
    outline: none;
}
</style>
