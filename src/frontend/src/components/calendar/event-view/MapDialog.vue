<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { injectEventView } from '../../../composables/useEventView';
import GoogleMapsEmbed from './GoogleMapsEmbed.vue';

const props = defineProps<{
    visible: boolean;
    lat: number;
    lon: number;
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
            <GoogleMapsEmbed :query="location" :lat="lat" :lon="lon" :zoom="15" interactive />
        </div>
    </Dialog>
</template>

<style scoped>
.map-dialog :deep(.p-dialog-header-actions) {
    margin-left: auto;
}
</style>
