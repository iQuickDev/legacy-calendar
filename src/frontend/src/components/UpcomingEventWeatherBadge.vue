<script setup lang="ts">
import Tag from 'primevue/tag';
import { computed, onMounted, watch } from 'vue';
import type { Event } from '../types/Event';
import { useEventWeather, mapWeatherCodeToSummary } from '../composables/useEventWeather';
import MeteoconIcon from './MeteoconIcon.vue';

const props = withDefaults(
    defineProps<{
        event: Event;
        compact?: boolean;
    }>(),
    {
        compact: true
    }
);

const emit = defineEmits<{
    (e: 'open-detail'): void;
}>();

const { getWeatherForEvent, loadWeatherForEvent } = useEventWeather();
const weather = computed(() => getWeatherForEvent(props.event.id));

const weatherInfo = computed(() => {
    if (!weather.value || weather.value.weatherCode === null) return null;
    return mapWeatherCodeToSummary(weather.value.weatherCode, weather.value.isDay);
});

onMounted(() => {
    loadWeatherForEvent(props.event);
});

watch(
    () => props.event,
    (newEv) => {
        loadWeatherForEvent(newEv);
    },
    { deep: true }
);
</script>

<template>
    <div
        v-if="weather"
        class="weather-badge-trigger inline-flex cursor-pointer transition-transform active:scale-95"
        @click.stop="emit('open-detail')"
    >
        <Tag
            severity="secondary"
            rounded
            class="hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center gap-1.5 transition-all"
        >
            <MeteoconIcon v-if="weatherInfo" :slug="weatherInfo.meteoconSlug" :size="18" />
            <span class="font-bold"> {{ Math.round(weather.temperature ?? 0) }}° </span>
            <span v-if="!compact" class="text-surface-400 ml-1 text-xs font-medium">
                {{ weather.summary }}
            </span>
        </Tag>
    </div>
</template>
