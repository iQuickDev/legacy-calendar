<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { injectEventView } from '../../../composables/useEventView';

const props = defineProps<{
    visible: boolean;
    lat: number;
    lon: number;
    color?: string;
    location?: string;
}>();

const { openNavigation } = injectEventView();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

const showDialog = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const mapContainer = ref<HTMLElement | null>(null);
let map: maplibregl.Map | null = null;
let marker: maplibregl.Marker | null = null;

const initMap = () => {
    if (!mapContainer.value) return;

    map = new maplibregl.Map({
        container: mapContainer.value,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [props.lon, props.lat],
        zoom: 15,
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

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.addControl(
        new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }),
        'top-right'
    );

    marker = new maplibregl.Marker({
        color: props.color || '#3b82f6'
    })
        .setLngLat([props.lon, props.lat])
        .addTo(map);
};

onMounted(async () => {
    await nextTick();
    // Small delay to ensure the dialog animation has started and the container has dimensions
    setTimeout(() => {
        initMap();
    }, 150);
});

onUnmounted(() => {
    if (map) {
        map.remove();
        map = null;
    }
});

watch(
    () => props.color,
    (newColor) => {
        if (marker && map) {
            marker.remove();
            marker = new maplibregl.Marker({
                color: newColor || '#3b82f6'
            })
                .setLngLat([props.lon, props.lat])
                .addTo(map);
        }
    }
);
</script>

<template>
    <Dialog
        v-model:visible="showDialog"
        modal
        dismissableMask
        header="Location"
        :style="{ width: '1000px' }"
        :breakpoints="{ '960px': '85vw', '640px': '95vw' }"
        :pt="{
            root: {
                class: 'map-dialog border-zinc-800 border bg-zinc-950 shadow-2xl rounded-2xl overflow-hidden'
            },
            header: { class: 'bg-zinc-950 text-white border-b border-zinc-800 p-4' },
            content: { class: 'p-0! h-[75vh] sm:h-[85vh]' }
        }"
    >
        <template #header>
            <div class="flex w-full justify-between gap-0.5">
                <div class="flex flex-col justify-center">
                    <span class="text-xs font-bold tracking-widest text-zinc-500 uppercase">Location</span>
                    <span class="text-sm font-semibold text-white">{{ location || 'Map' }}</span>
                </div>

                <Button
                    icon="pi pi-map"
                    aria-label="View on Maps"
                    text
                    class="text-md"
                    @click="openNavigation(location!)"
                />
            </div>
        </template>

        <div class="relative h-full w-full">
            <div ref="mapContainer" class="h-full w-full"></div>
            <!-- Attribution -->
            <div class="pointer-events-none absolute bottom-2 left-2 z-10">
                <span class="text-[10px] font-medium text-zinc-400 uppercase opacity-70">© OpenFreeMap</span>
            </div>
        </div>
    </Dialog>
</template>

<style scoped>
:deep(.maplibregl-canvas) {
    outline: none;
}

.map-dialog :deep(.p-dialog-header-actions) {
    margin-left: auto;
}
</style>
