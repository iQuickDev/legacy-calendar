<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    query?: string;
    lat: number;
    lon: number;
    zoom?: number;
    interactive?: boolean;
}>();

const embedSrc = computed(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY;
    if (!apiKey) return '';

    const hasQuery = typeof props.query === 'string' && props.query.trim().length > 0;
    const params = new URLSearchParams({
        key: apiKey,
        maptype: 'satellite'
    });

    if (hasQuery) {
        params.set('q', props.query!.trim());
        return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
    }

    params.set('center', `${props.lat},${props.lon}`);
    params.set('zoom', String(props.zoom ?? 15));
    return `https://www.google.com/maps/embed/v1/view?${params.toString()}`;
});
</script>

<template>
    <div class="relative h-full w-full overflow-hidden">
        <iframe
            v-if="embedSrc"
            :src="embedSrc"
            class="h-full w-full border-0"
            :class="interactive ? 'pointer-events-auto' : 'pointer-events-none'"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
        />

        <div v-else class="flex h-full w-full items-center justify-center bg-zinc-950/80 text-center">
            <div class="max-w-xs px-6">
                <p class="text-sm font-semibold text-zinc-100">Google Maps API key is not configured.</p>
                <p class="mt-1 text-xs text-zinc-400">
                    Set <code>VITE_GOOGLE_MAPS_EMBED_API_KEY</code> to enable the map preview.
                </p>
            </div>
        </div>
    </div>
</template>
