<script setup lang="ts">
import { injectWeatherDialogState } from './useWeatherDialogState';
import MeteoconIcon from '../../../MeteoconIcon.vue';

const { displayInfo, displayTemp } = injectWeatherDialogState();
</script>

<template>
    <div class="flex flex-col items-center gap-2">
        <div class="flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-900">
            <MeteoconIcon :slug="displayInfo.meteoconSlug" :size="72" />
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
