<script setup lang="ts">
import { computed, ref, watch, onMounted, defineAsyncComponent } from 'vue';
import type { Event } from '../../../types/Event';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import TimeRemainingTag from '../../TimeRemainingTag.vue';
import Button from 'primevue/button';
import { injectEventView } from '../../../composables/useEventView';
import api from '../../../services/API';
import type { ChatMessage } from '../../../types/Chat';
import { useRoute, useRouter } from 'vue-router';

import UpcomingEventWeatherBadge from '../../UpcomingEventWeatherBadge.vue';
import { useEventWeather } from '../../../composables/useEventWeather';
import { useGeocode } from '../../../composables/useGeocode';

const WeatherDialog = defineAsyncComponent(() => import('./weather/WeatherDialog.vue'));
const EventMapPreview = defineAsyncComponent(() => import('./EventMapPreview.vue'));
const MapDialog = defineAsyncComponent(() => import('./MapDialog.vue'));

const props = defineProps<{
    event: Event;
}>();

const route = useRoute();
const router = useRouter();
const { getWeatherForEvent } = useEventWeather();
const { getCoordsForEvent, getOrResolveCoords } = useGeocode();

const weather = computed(() => getWeatherForEvent(props.event.id));
const coords = computed(() => getCoordsForEvent(props.event.id));

const weatherDetailVisible = ref(false);
const currentSection = computed(() =>
    route.name === 'upcoming' || route.path.startsWith('/upcoming/') ? 'upcoming' : 'calendar'
);
const eventPath = computed(() => `${currentSection.value === 'upcoming' ? '/upcoming' : '/event'}/${props.event.id}`);
const mapDialogVisible = computed({
    get: () => route.path.endsWith('/map'),
    set: (visible: boolean) => {
        if (visible) {
            void router.push({ path: `${eventPath.value}/map` });
        } else {
            void router.replace({ path: eventPath.value });
        }
    }
});

const emit = defineEmits<{
    (e: 'open-chat'): void;
}>();

const formattedStart = computed(() => {
    if (!props.event?.startTime) return '';
    return format(parseISO(props.event.startTime), 'd MMMM yyyy HH:mm');
});

const formattedEnd = computed(() => {
    if (!props.event?.endTime) return '';
    return format(parseISO(props.event.endTime), 'd MMMM yyyy HH:mm');
});

const formattedParticipationDeadline = computed(() => {
    if (!props.event?.participationDeadline) return '';
    return format(parseISO(props.event.participationDeadline), 'd MMMM yyyy HH:mm');
});

const { openNavigation, canAccessChat } = injectEventView();

import UserAvatar from '../../UserAvatar.vue';
const recentMessages = ref<ChatMessage[]>([]);

const loadRecentMessages = async () => {
    if (!props.event?.id || !canAccessChat.value) {
        recentMessages.value = [];
        return;
    }

    try {
        const response = await api.getChatHistory(props.event.id, undefined, 3);
        recentMessages.value = [...response.data.messages].reverse();
    } catch {
        recentMessages.value = [];
    }
};

onMounted(() => {
    void getOrResolveCoords(props.event);
});

watch(
    () => [props.event?.id, canAccessChat.value],
    () => {
        void loadRecentMessages();
        if (props.event) {
            void getOrResolveCoords(props.event);
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Map Preview at the top -->
        <EventMapPreview
            v-if="coords"
            :location="event.location"
            :lat="coords.lat"
            :lon="coords.lon"
            @open-map="mapDialogVisible = true"
        />

        <!-- Recent Messages Box -->
        <div v-if="canAccessChat" class="flex flex-col gap-3">
            <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                <i class="pi pi-comments"></i>
                <span class="text-sm font-semibold tracking-wider uppercase">Recent Messages</span>
            </div>

            <div v-if="recentMessages.length === 0" class="flex items-center justify-center">
                <span class="text-zinc-500">No messages yet.</span>
            </div>

            <div v-else class="group relative cursor-pointer overflow-hidden rounded-2xl" @click="emit('open-chat')">
                <div class="flex max-h-[150px] flex-col gap-3">
                    <div
                        v-for="msg in recentMessages"
                        :key="msg.id"
                        class="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3 transition-all duration-300 dark:border-zinc-800/50 dark:bg-zinc-900/30"
                    >
                        <UserAvatar :username="msg.authorUsername" class="h-8! w-8!" />
                        <div class="flex min-w-0 flex-1 flex-col">
                            <div class="flex items-center justify-between gap-2">
                                <span class="truncate text-sm font-bold">{{ msg.authorUsername }}</span>
                                <span class="text-surface-500 text-[10px] whitespace-nowrap">
                                    {{
                                        formatDistanceToNowStrict(parseISO(String(msg.createdAt)), { addSuffix: true })
                                    }}
                                </span>
                            </div>
                            <p class="text-surface-600 dark:text-surface-400 m-0 truncate text-xs">
                                {{ msg.text || `${msg.mediaType || 'media'} message` }}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    class="from-surface-0 via-surface-0/90 absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-linear-to-t to-transparent pb-1 transition-all duration-300 dark:from-zinc-950 dark:via-zinc-950/90"
                >
                    <span class="text-surface-500 group-hover:text-primary-500 text-sm font-bold transition-colors"
                        >View all messages</span
                    >
                </div>
            </div>
        </div>

        <div v-if="event.description" class="flex flex-col gap-2">
            <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                <i class="pi pi-align-left"></i>
                <span class="font-semibold">Description</span>
            </div>
            <p class="text-surface-700 dark:text-surface-300 m-0 pl-6 whitespace-pre-wrap">{{ event.description }}</p>
        </div>

        <div v-if="event.location" class="flex flex-col gap-2">
            <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                <i class="pi pi-map-marker"></i>
                <span class="font-semibold">Location</span>
                <Button
                    icon="pi pi-map"
                    label="View on Maps"
                    text
                    size="small"
                    class="h-7 py-0 text-xs!"
                    @click="openNavigation(event.location)"
                />
            </div>
            <p class="text-surface-700 dark:text-surface-300 m-0 flex flex-wrap items-center gap-2 pl-6">
                {{ event.location }}
                <UpcomingEventWeatherBadge :event="event" :compact="false" @open-detail="weatherDetailVisible = true" />
            </p>
        </div>

        <WeatherDialog v-model:visible="weatherDetailVisible" :event="event" :weather="weather" />
        <MapDialog
            v-model:visible="mapDialogVisible"
            :lat="coords?.lat ?? 0"
            :lon="coords?.lon ?? 0"
            :location="event.location"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
                <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                    <i class="pi pi-calendar"></i>
                    <span class="font-semibold">Start</span>
                    <TimeRemainingTag :target-date="event.startTime" />
                </div>
                <div class="pl-6">
                    <p class="text-surface-700 dark:text-surface-300 m-0">{{ formattedStart }}</p>
                </div>
            </div>

            <div v-if="formattedEnd" class="flex flex-col gap-2">
                <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                    <i class="pi pi-calendar-times"></i>
                    <span class="font-semibold">End</span>
                </div>
                <div class="pl-6">
                    <p class="text-surface-700 dark:text-surface-300 m-0">{{ formattedEnd }}</p>
                </div>
            </div>

            <div v-if="formattedParticipationDeadline" class="flex flex-col gap-2">
                <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                    <i class="pi pi-clock"></i>
                    <span class="font-semibold">Deadline</span>
                    <TimeRemainingTag :target-date="event.participationDeadline" />
                </div>
                <div class="pl-6">
                    <p class="text-surface-700 dark:text-surface-300 m-0">{{ formattedParticipationDeadline }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
