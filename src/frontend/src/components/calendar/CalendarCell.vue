<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarDay } from '../../types/Calendar';
import type { Event } from '../../types/Event';
import EventCard from './EventCard.vue';
import { useMagicCard } from '../../composables/useMagicCard';

const props = defineProps<{
    day: CalendarDay;
    isMobile: boolean;
}>();

const emit = defineEmits<{
    (e: 'add-event', date: Date): void;
    (e: 'view-event', event: Event): void;
    (e: 'zoom-day', day: CalendarDay): void;
}>();

const handleClick = () => {
    if (props.day.isPast) {
        emit('zoom-day', props.day);
        return;
    }

    if (props.isMobile && props.day.events.length > 0) {
        emit('zoom-day', props.day);
    } else {
        emit('add-event', props.day.date);
    }
};

const spotlightColor = computed(() => (props.day.isToday ? '#064e23' : '#262626'));

//@ts-expect-error - useMagicCard is not typed
const { cardRef, backgroundStyle } = useMagicCard({
    gradientSize: 250,
    gradientColor: () => spotlightColor.value,
    gradientOpacity: 0.8
});
</script>

<template>
    <div
        ref="cardRef"
        class="calendar-cell stagger-reveal group relative flex min-h-[80px] flex-col items-stretch gap-1 pt-1 pr-0 pb-0 pl-1 md:min-h-0 md:p-2"
        :data-today="day.isToday || undefined"
        :class="[
            {
                'cell-active': day.isCurrentMonth,
                'cell-inactive': !day.isCurrentMonth,
                'cell-today': day.isToday
            }
        ]"
    >
        <!-- Background Click Area (Z-0) -->
        <div class="absolute inset-0 z-0 cursor-pointer" @click="handleClick"></div>

        <!-- Content Layer (Z-10) - Pointer events disabled so background catches empty clicks -->
        <div class="pointer-events-none relative z-10 flex h-full flex-col">
            <!-- Date Header -->
            <div class="mb-0.5 flex w-full justify-center md:mb-1 md:justify-start">
                <span
                    class="day-number flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 md:h-7 md:w-7 md:text-sm"
                    :class="{
                        'today-badge': day.isToday,
                        'text-surface-600 dark:text-surface-400': !day.isToday && day.isCurrentMonth,
                        'text-surface-700': !day.isCurrentMonth
                    }"
                >
                    {{ day.date.getDate() }}
                </span>
            </div>

            <!-- Events List - Re-enable pointer events ONLY for the cards -->
            <div class="flex flex-1 flex-col gap-1 overflow-y-auto pr-0 pb-0 md:pr-1 md:pb-1">
                <EventCard
                    v-for="event in day.events"
                    :key="event.id"
                    :event="event"
                    class="pointer-events-auto"
                    @click="emit('view-event', event)"
                />
            </div>
        </div>

        <!-- Magic card spotlight overlay -->
        <div class="magic-spotlight" :style="backgroundStyle"></div>

        <!-- Today green glow -->
        <div v-if="day.isToday" class="today-glow"></div>
    </div>
</template>

<style scoped>
/* Base cell styling — no borders, opaque bg for grid-gap approach */
.calendar-cell {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    background: #000000;
}

/* Active (current month) cells */
.cell-active {
    background: #000000;
}

.cell-active:hover {
    z-index: 10;
}

/* Inactive (other months) cells — muted bg + text, no opacity */
.cell-inactive {
    background: #000000;
}

.cell-inactive .day-number {
    color: rgba(255, 255, 255, 0.2);
}

.today-glow .day-number {
    color: white !important;
}

/* Today cell - gentle green tint (opaque equivalents over #000) */
.cell-today {
    background: #020c06;
    box-shadow: inset 0 0 30px rgba(34, 197, 94, 0.05);
}

.cell-today:hover {
    background: #041a0b;
}

/* Today badge styling */
.today-badge {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white !important;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
}

/* Magic card spotlight overlay */
.magic-spotlight {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.cell-active:hover .magic-spotlight {
    opacity: 1;
}

/* Today green glow effect */
.today-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    opacity: 0.8;
}

/* Animated border glow on hover for active cells */
.cell-active::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid transparent;
    transition: border-color 0.3s ease;
    pointer-events: none;
}

.cell-active:hover::before {
    border-color: rgba(255, 255, 255, 0.08);
}
</style>
