<script setup lang="ts">
import { computed } from 'vue';
import { differenceInMinutes, isAfter, isBefore, addMinutes } from 'date-fns';
import { useNow } from '../composables/useNow';
import type { Event } from '../types/Event';

const props = defineProps<{
    event: Event;
}>();

const { now } = useNow();

const startDate = computed(() => new Date(props.event.startTime));
const endDate = computed(() => (props.event.endTime ? new Date(props.event.endTime) : addMinutes(startDate.value, 60)));

const isEnded = computed(() => {
    return isAfter(now.value, endDate.value);
});

const isLive = computed(() => {
    return isBefore(startDate.value, now.value) && isBefore(now.value, endDate.value);
});

const isSoon = computed(() => {
    const diff = differenceInMinutes(startDate.value, now.value);
    return diff > 0 && diff <= 60;
});

const state = computed(() => {
    if (isEnded.value) return 'ENDED';
    if (isLive.value) return 'LIVE';
    if (isSoon.value) return 'SOON';
    return 'UPCOMING';
});

const displayTime = computed(() => {
    if (isLive.value) return 'Now';
    if (isEnded.value) return 'Ended';

    const diffMins = differenceInMinutes(startDate.value, now.value);
    if (diffMins <= 0) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
});

const statusClasses = computed(() => {
    switch (state.value) {
        case 'ENDED':
            return 'text-red-400/80 border-red-500/10 bg-red-500/5';
        case 'LIVE':
            return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.1)]';
        case 'SOON':
            return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
        default:
            return 'text-surface-300 border-white/10 bg-white/5';
    }
});
</script>

<template>
    <div
        class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-300"
        :class="statusClasses"
    >
        <span v-if="state === 'LIVE'" class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
        </span>
        <span>{{ state }}</span>
        <template v-if="state !== 'ENDED'">
            <span class="opacity-40">•</span>
            <span>{{ displayTime }}</span>
        </template>
    </div>
</template>
