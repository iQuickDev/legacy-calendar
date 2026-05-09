<script setup lang="ts">
import { injectWeatherDialogState } from './useWeatherDialogState';
import { mapWeatherCodeToSummary } from '../../../../composables/useEventWeather';

const {
    hourlyForSelectedDay,
    // @ts-expect-error - hourlyScrollContainer is needed, otherwise autoscroll won't work!
    hourlyScrollContainer,
    isSelected,
    selectHour,
    formatHour,
    resetSelection,
    isModified
} = injectWeatherDialogState();
</script>

<template>
    <div v-if="hourlyForSelectedDay.length" class="mt-4 border-t border-zinc-800 pt-4">
        <div class="mb-2 flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Hourly</span>
            <button
                v-if="isModified"
                @click="resetSelection"
                class="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-zinc-600 uppercase transition-colors hover:text-zinc-400"
            >
                <i class="pi pi-refresh text-[8px]"></i>
                Reset
            </button>
        </div>
        <div ref="hourlyScrollContainer" class="no-scrollbar flex gap-3 overflow-x-auto pb-4">
            <button
                v-for="hour in hourlyForSelectedDay"
                :key="hour.time"
                :data-active="isSelected(hour)"
                @click="selectHour(hour)"
                class="flex min-w-[60px] flex-col items-center gap-3 rounded-xl border py-4 transition-all"
                :class="[
                    isSelected(hour)
                        ? 'border-zinc-600 bg-zinc-800'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                ]"
            >
                <span class="text-[10px] font-bold text-zinc-500">{{ formatHour(hour.time) }}</span>
                <span class="weather-emoji-sm">{{ mapWeatherCodeToSummary(hour.weatherCode).emoji }}</span>
                <span class="text-sm font-bold">{{ Math.round(hour.temperature) }}°</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.weather-emoji-sm {
    font-family: var(--font-emoji);
    font-size: 1.25rem;
    line-height: 1;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
