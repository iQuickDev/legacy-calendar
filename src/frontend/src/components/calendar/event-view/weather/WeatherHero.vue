<script setup lang="ts">
import { injectWeatherDialogState } from './useWeatherDialogState';

const { displayInfo, displayTemp } = injectWeatherDialogState();
</script>

<template>
    <div class="flex flex-col items-center gap-2">
        <div class="flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-900">
            <span class="weather-emoji-hero text-6xl">
                {{ displayInfo.emoji }}
            </span>
        </div>
        <div class="mt-4 flex items-start">
            <span class="ml-2 text-7xl font-bold tracking-tighter">{{ displayTemp }}</span>
            <span class="mt-2 ml-1 text-3xl font-light text-zinc-600">°</span>
        </div>
        <span class="text-xl font-semibold tracking-tight text-zinc-200">
            {{ displayInfo.summary }}
        </span>
    </div>
</template>

<style scoped>
.weather-emoji-hero {
    font-family: var(--font-emoji);
    line-height: 1;
}
</style>
