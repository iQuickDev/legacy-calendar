<script setup lang="ts">
import { ref, watchEffect } from 'vue';

const props = defineProps<{
    slug: string;
    style?: 'fill' | 'flat' | 'line' | 'monochrome';
    size?: number;
}>();

// Lazy glob – each SVG is a () => Promise, loaded on demand instead of eagerly.
// This prevents bundling every meteocon SVG into a single massive chunk.
const iconImporters = import.meta.glob('../../node_modules/@meteocons/svg/**/*.svg', {
    query: '?url',
    import: 'default'
});

const src = ref('');

watchEffect(async () => {
    const style = props.style ?? 'fill';
    const slug = props.slug || 'not-available';
    const path = `../../node_modules/@meteocons/svg/${style}/${slug}.svg`;

    const loader = iconImporters[path] ?? iconImporters[`../../node_modules/@meteocons/svg/${style}/not-available.svg`];

    if (loader) {
        src.value = (await loader()) as string;
    } else {
        src.value = '';
    }
});
</script>

<template>
    <img v-if="src" :src="src" :alt="slug" :width="size ?? 64" :height="size ?? 64" class="meteocon-icon" />
</template>

<style scoped>
.meteocon-icon {
    display: inline-block;
    vertical-align: middle;
}
</style>
