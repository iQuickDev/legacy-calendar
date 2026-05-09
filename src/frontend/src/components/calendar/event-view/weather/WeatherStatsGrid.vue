<script setup lang="ts">
import { computed } from 'vue';
import { injectWeatherDialogState } from './useWeatherDialogState';

const { displayFeelsLike, displayWind, displayPrecipitation, displayHumidity } = injectWeatherDialogState();

const stats = computed(() => [
    { label: 'Feels like', value: `${displayFeelsLike.value}°`, emoji: '🌡️' },
    { label: 'Wind', value: `${displayWind.value} km/h`, emoji: '💨' },
    { label: 'Rain chance', value: `${displayPrecipitation.value}%`, emoji: '💧' },
    { label: 'Humidity', value: `${displayHumidity.value}%`, emoji: '🌊' }
]);
</script>

<template>
    <div class="mt-10 grid grid-cols-2 gap-4">
        <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex flex-col gap-1 rounded-xl border border-zinc-800/50 bg-zinc-900 p-4"
        >
            <div class="flex items-center gap-2 text-zinc-500">
                <span class="font-emoji text-[10px]">{{ stat.emoji }}</span>
                <span class="text-[9px] font-bold tracking-wider uppercase">{{ stat.label }}</span>
            </div>
            <span class="text-lg font-bold">
                <template v-if="stat.label === 'Wind'">
                    {{ displayWind }} <span class="text-xs font-normal opacity-40">km/h</span>
                </template>
                <template v-else>
                    {{ stat.value }}
                </template>
            </span>
        </div>
    </div>
</template>
