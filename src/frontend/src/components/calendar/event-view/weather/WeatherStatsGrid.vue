<script setup lang="ts">
import { computed } from 'vue';
import { injectWeatherDialogState } from './useWeatherDialogState';
import MeteoconIcon from '../../../MeteoconIcon.vue';

const { displayFeelsLike, displayWind, displayPrecipitation, displayHumidity } = injectWeatherDialogState();

const stats = computed(() => [
    { label: 'Feels like', value: displayFeelsLike.value, slug: 'thermometer', unit: '°C' },
    { label: 'Wind', value: displayWind.value, slug: 'wind', unit: 'km/h' },
    { label: 'Rain chance', value: displayPrecipitation.value, slug: 'raindrop', unit: '%' },
    { label: 'Humidity', value: displayHumidity.value, slug: 'humidity', unit: '%' }
]);
</script>

<template>
    <div class="mt-10 grid grid-cols-2 gap-4">
        <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900 p-2"
        >
            <div class="flex items-center gap-2 text-zinc-500">
                <MeteoconIcon :slug="stat.slug" :size="50" />
            </div>
            <div class="flex flex-col justify-center text-lg font-bold">
                <div class="w-full text-[10px] font-bold tracking-wider uppercase">{{ stat.label }}</div>

                <div>
                    {{ stat.value }}
                    <span v-if="stat.unit" class="text-xs font-normal opacity-40"> {{ stat.unit }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
