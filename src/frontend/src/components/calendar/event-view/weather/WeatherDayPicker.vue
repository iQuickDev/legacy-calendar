<script setup lang="ts">
import { injectWeatherDialogState } from './useWeatherDialogState';

const {
    availableDays,
    // @ts-expect-error - dayScrollContainer is needed, otherwise autoscroll won't work!
    dayScrollContainer,
    selectDay,
    formatDay,
    formatDayFull,
    resetSelection,
    isModified,
    isSelectedDay
} = injectWeatherDialogState();
</script>

<template>
    <div v-if="availableDays.length > 1" class="border-t border-zinc-800 pt-4">
        <div class="mb-2 flex items-center justify-between px-1">
            <span class="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Daily</span>
            <button
                v-if="isModified"
                @click="resetSelection"
                class="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-zinc-600 uppercase transition-colors hover:text-zinc-400"
            >
                <i class="pi pi-refresh text-[8px]"></i>
                Reset
            </button>
        </div>
        <div ref="dayScrollContainer" class="no-scrollbar flex gap-2 overflow-x-auto">
            <button
                v-for="day in availableDays"
                :key="day.toISOString()"
                :data-active="isSelectedDay(day)"
                @click="selectDay(day)"
                class="flex min-w-[75px] flex-col items-center gap-1 rounded-xl border p-2 transition-all"
                :class="[
                    isSelectedDay(day)
                        ? 'border-zinc-100 bg-zinc-100'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                ]"
            >
                <span
                    class="text-[9px] font-bold uppercase"
                    :class="isSelectedDay(day) ? 'text-zinc-900' : 'text-zinc-500'"
                >
                    {{ formatDay(day) }}
                </span>
                <span class="text-[11px] font-bold" :class="isSelectedDay(day) ? 'text-zinc-950' : 'text-zinc-200'">
                    {{ formatDayFull(day) }}
                </span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
