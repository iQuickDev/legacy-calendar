<script lang="ts">
// Module-level cache: one fetch per slug, shared across all instances.
const jsonCache = new Map<string, Promise<Record<string, unknown>>>();

function fetchLottieJson(slug: string): Promise<Record<string, unknown>> {
    const cached = jsonCache.get(slug);
    if (cached) return cached;

    const promise = fetch(`/meteocons/${slug}.json`)
        .then((r) => r.json())
        .catch(() => {
            jsonCache.delete(slug); // allow retry on failure
            return null;
        });

    jsonCache.set(slug, promise);
    return promise;
}
</script>

<script setup lang="ts">
import lottie from 'lottie-web/build/player/lottie_light';
import type { AnimationItem } from 'lottie-web';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
    slug: string;
    size?: number;
}>();

const container = ref<HTMLElement>();
let animation: AnimationItem | null = null;

const loadAnimation = async () => {
    if (!container.value) return;

    animation?.destroy();
    animation = null;

    const slug = props.slug || 'not-available';
    const data = await fetchLottieJson(slug);
    if (!data || !container.value) return;

    animation = lottie.loadAnimation({
        container: container.value,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        // Deep clone so each lottie instance gets its own mutable copy
        animationData: JSON.parse(JSON.stringify(data))
    });
};

onMounted(loadAnimation);

watch(() => props.slug, loadAnimation);

onUnmounted(() => animation?.destroy());
</script>

<template>
    <div ref="container" :style="{ width: `${size ?? 64}px`, height: `${size ?? 64}px` }" />
</template>
