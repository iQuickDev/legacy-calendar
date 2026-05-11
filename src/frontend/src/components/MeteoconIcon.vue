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

const loadAnimation = () => {
    if (!container.value) return;

    // Destroy previous animation if slug changed
    animation?.destroy();
    animation = null;

    const slug = props.slug || 'not-available';

    // Load the Lottie JSON at runtime via URL (served from public/meteocons/).
    // No Vite bundling involved – only the icons actually rendered are fetched.
    animation = lottie.loadAnimation({
        container: container.value,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: `/meteocons/${slug}.json`
    });
};

onMounted(loadAnimation);

watch(() => props.slug, loadAnimation);

onUnmounted(() => animation?.destroy());
</script>

<template>
    <div ref="container" :style="{ width: `${size ?? 64}px`, height: `${size ?? 64}px` }" />
</template>
