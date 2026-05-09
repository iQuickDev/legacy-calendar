<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import Button from 'primevue/button';
import type { Event } from '../types/Event';
import { useMagicCard } from '../composables/useMagicCard';
import UserAvatarGroup from './UserAvatarGroup.vue';
import EventStatusPill from './EventStatusPill.vue';
import { useShareEvent } from '../composables/useShareEvent';
import { getActiveParticipants, openNavigation } from '../utils/event';
import { useEventCardStyle } from '../composables/useEventCardStyle';
import { useEventWeather } from '../composables/useEventWeather';
import WeatherDialog from './calendar/event-view/weather/WeatherDialog.vue';

import UpcomingEventWeatherBadge from './UpcomingEventWeatherBadge.vue';

const props = defineProps<{
    event: Event;
}>();

const emit = defineEmits<{
    (e: 'view', event: Event): void;
}>();

const { shareEvent } = useShareEvent();
const { activityColor, cardStyle, locationStyle, navigationButtonStyle } = useEventCardStyle(
    toRef(props.event, 'color'),
    'event'
);

const activeParticipants = computed(() => getActiveParticipants(props.event.participants));
const weatherDetailVisible = ref(false);
const { getWeatherForEvent } = useEventWeather();
const weather = computed(() => getWeatherForEvent(props.event.id));

// @ts-expect-error - used in template
const { cardRef, backgroundStyle } = useMagicCard({
    gradientSize: 260,
    gradientColor: activityColor,
    gradientOpacity: 0.16
});
</script>

<template>
    <div
        ref="cardRef"
        class="upcoming-event-card stagger-reveal group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 sm:p-6"
        :style="cardStyle"
        @click="emit('view', event)"
    >
        <div class="relative z-10 flex flex-col gap-4">
            <!-- Top row: Pill -->
            <div class="flex items-center gap-2">
                <EventStatusPill :event="event" />
                <i v-if="props.event.isPrivate" class="pi pi-lock text-surface-500 ml-auto" title="Private Event"></i>
            </div>

            <!-- Title & Time -->
            <div class="flex flex-col gap-1">
                <div class="flex items-start justify-between gap-2">
                    <h3
                        class="text-surface-0 m-0 line-clamp-2 text-2xl font-black tracking-tight wrap-break-word sm:text-3xl"
                    >
                        {{ event.title }}
                    </h3>
                    <Button
                        v-tooltip.top="'Share Event'"
                        severity="secondary"
                        text
                        rounded
                        icon="pi pi-share-alt"
                        class="hover:bg-transparent! hover:brightness-120!"
                        @click.stop="shareEvent(event.id)"
                    />
                </div>
            </div>

            <!-- Description / Link -->
            <p v-if="event.description" class="m-0 line-clamp-2 text-sm wrap-break-word text-zinc-400 sm:text-base">
                {{ event.description }}
            </p>

            <!-- Location & Participants -->
            <div class="mt-2 flex flex-col justify-between gap-4">
                <div
                    v-if="event.location"
                    class="flex max-w-full flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                    :style="locationStyle"
                >
                    <i class="pi pi-map-marker text-surface-400 shrink-0"></i>
                    <span class="text-surface-100 truncate font-semibold">{{ event.location }}</span>
                    <UpcomingEventWeatherBadge
                        :event="event"
                        class="ml-auto"
                        @open-detail="weatherDetailVisible = true"
                    />
                </div>

                <div v-if="activeParticipants.length > 0" class="flex items-center justify-center gap-3">
                    <UserAvatarGroup :participants="activeParticipants" />
                    <span class="text-surface-400 text-xs font-medium sm:text-sm">
                        {{ activeParticipants.length }} attending
                    </span>
                </div>
            </div>

            <!-- Actions -->
            <div class="mt-2 flex flex-col gap-2">
                <Button
                    v-if="event.location"
                    class="navigation-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-colors sm:text-base"
                    :style="navigationButtonStyle"
                    @click.stop="openNavigation(event.location)"
                >
                    <i class="pi pi-map"></i>
                    <span>Start Navigation</span>
                </Button>

                <Button
                    label="Event Details"
                    severity="secondary"
                    text
                    class="text-sm! hover:bg-transparent! hover:brightness-120!"
                    @click="emit('view', event)"
                />
            </div>
        </div>

        <div class="magic-spotlight" :style="backgroundStyle"></div>
        <WeatherDialog v-model:visible="weatherDetailVisible" :event="event" :weather="weather" />
    </div>
</template>

<style scoped>
.upcoming-event-card {
    background: #000000;
    border: 1px solid #262626;
    cursor: pointer;
    transition: all 0.25s ease;
}

.upcoming-event-card:hover {
    border-color: var(--event-accent-border);
    transform: translateY(-2px);
    box-shadow:
        0 12px 28px -20px var(--event-accent-shadow),
        0 12px 40px -10px rgba(0, 0, 0, 0.8);
}

.upcoming-event-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid transparent;
    background:
        linear-gradient(#0000, #0000) padding-box,
        linear-gradient(155deg, var(--event-accent-border), rgba(255, 255, 255, 0.03), transparent) border-box;
    pointer-events: none;
}

.feature-tag {
    border-color: var(--event-accent-border);
    background: linear-gradient(135deg, var(--event-accent-faint) 0%, rgba(255, 255, 255, 0.03) 100%);
}

.navigation-button:hover {
    filter: brightness(1.04);
    border-color: var(--event-action-border-hover);
}

.magic-spotlight {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 0;
}

.upcoming-event-card:hover .magic-spotlight {
    opacity: 0.6;
}
</style>
