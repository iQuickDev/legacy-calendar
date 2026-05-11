<script setup lang="ts">
import lottie from 'lottie-web/build/player/lottie_light';
import type { AnimationItem } from 'lottie-web';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
    slug: string;
    size?: number;
}>();

// Lazy glob – each JSON is a () => Promise, loaded on demand.
const lottieImporters = import.meta.glob<{ default: Record<string, unknown> }>(
    '../../node_modules/@meteocons/lottie/fill/*.json'
);

const container = ref<HTMLElement>();
let animation: AnimationItem | null = null;

const loadAnimation = async () => {
    if (!container.value) return;

    // Destroy previous animation if slug changed
    animation?.destroy();
    animation = null;

    const slug = props.slug || 'not-available';
    const path = `../../node_modules/@meteocons/lottie/fill/${slug}.json`;
    const loader =
        lottieImporters[path] ?? lottieImporters['../../node_modules/@meteocons/lottie/fill/not-available.json'];

    if (!loader) return;

    const mod = await loader();

    animation = lottie.loadAnimation({
        container: container.value,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: mod.default
    });
};

onMounted(loadAnimation);

watch(() => props.slug, loadAnimation);

onUnmounted(() => animation?.destroy());
</script>

<template>
    <div ref="container" :style="{ width: `${size ?? 64}px`, height: `${size ?? 64}px` }" />
</template>
