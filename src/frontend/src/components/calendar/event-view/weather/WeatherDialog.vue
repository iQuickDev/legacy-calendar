<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import type { Event } from '../../../../types/Event';
import type { EventWeather } from '../../../../types/Weather';
import { useWeatherDialogState } from './useWeatherDialogState';

import WeatherHero from './WeatherHero.vue';
import WeatherStatsGrid from './WeatherStatsGrid.vue';
import WeatherHourlyTimeline from './WeatherHourlyTimeline.vue';
import WeatherDayPicker from './WeatherDayPicker.vue';

const props = defineProps<{
    visible: boolean;
    event: Event;
    weather: EventWeather | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

const { selectedDay, formatDayFull, selectedHourTime, formatHour } = useWeatherDialogState(props);

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
        :style="{ width: '94vw', maxWidth: '420px' }"
        :pt="{
            root: {
                class: 'weather-solid-dialog border-zinc-800 border bg-zinc-950 shadow-2xl rounded-2xl'
            },
            header: { class: 'hidden' },
            content: { class: 'p-0!' }
        }"
    >
        <template #header>
            <div class="items-cente flex flex-col">
                <span class="text-md font-bold uppercase">
                    {{ event.location }}
                </span>
                <div class="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <span>{{ formatDayFull(selectedDay) }}</span>
                    <span v-if="selectedHourTime" class="flex items-center gap-2">
                        <span class="h-1 w-1 rounded-full bg-zinc-700"></span>
                        <span>{{ formatHour(selectedHourTime) }}</span>
                    </span>
                </div>
            </div>
        </template>

        <div class="text-zinc-0 flex flex-col p-4">
            <WeatherHero v-if="weather" />
            <WeatherStatsGrid v-if="weather" />
            <WeatherHourlyTimeline v-if="weather" />
            <WeatherDayPicker v-if="weather" />

            <!-- Provider footer -->
            <div class="mt-6 flex justify-center opacity-30">
                <span class="text-[8px] font-bold tracking-[0.4em] uppercase">Powered by Open-Meteo</span>
            </div>
        </div>
    </Dialog>
</template>

<style scoped>
.weather-solid-dialog {
    --p-dialog-content-background: var(--p-zinc-950);
}
</style>
