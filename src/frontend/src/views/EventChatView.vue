<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventsStore } from '../stores/events';
import { useSessionStore } from '../stores/session';
import type { Event } from '../types/Event';
import EventChatPanel from '../components/chat/EventChatPanel.vue';
import { useChatAccess } from '../composables/useEventView';

const route = useRoute();
const router = useRouter();
const eventsStore = useEventsStore();
const sessionStore = useSessionStore();
const event = ref<Event | null>(null);

const { canAccessChat, isChatAccessChecking } = useChatAccess(event);

const loadEvent = async () => {
    const id = Number(route.params.id);
    if (Number.isNaN(id)) {
        event.value = null;
        return;
    }

    event.value =
        eventsStore.events.find((item) => item.id === id) ||
        eventsStore.upcomingEvents.find((item) => item.id === id) ||
        null;
    if (!event.value) {
        try {
            await eventsStore.fetchEventById(id);
            event.value = eventsStore.events.find((item) => item.id === id) || null;
        } catch {
            event.value = null;
        }
    }
};

onMounted(() => {
    void loadEvent();
});

watch(
    [event, () => sessionStore.currentUser?.id, isChatAccessChecking],
    () => {
        const id = Number(route.params.id);
        if (!Number.isNaN(id) && event.value && !isChatAccessChecking.value && !canAccessChat.value) {
            router.replace({ name: 'calendar', query: { event: String(id) } });
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 h-dvh">
        <div v-if="isChatAccessChecking" class="flex h-full flex-col gap-4 overflow-hidden p-4">
            <div class="bg-surface-950/95 flex items-center gap-3 rounded-2xl p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                <div class="bg-surface-800 h-10 w-10 animate-pulse rounded-full"></div>
                <div class="min-w-0 flex-1 space-y-2">
                    <div class="bg-surface-800 h-4 w-32 animate-pulse rounded-full"></div>
                    <div class="bg-surface-800 h-3 w-44 animate-pulse rounded-full"></div>
                </div>
                <div class="bg-surface-800 h-8 w-16 animate-pulse rounded-full"></div>
            </div>

            <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                <div class="bg-surface-950/70 h-16 animate-pulse rounded-2xl"></div>
                <div class="min-h-0 flex-1 space-y-3 overflow-hidden">
                    <div
                        v-for="index in 4"
                        :key="index"
                        class="bg-surface-950/95 flex items-start gap-3 rounded-2xl p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.035)]"
                    >
                        <div class="bg-surface-800 h-10 w-10 animate-pulse rounded-full"></div>
                        <div class="min-w-0 flex-1 space-y-2">
                            <div class="flex items-center gap-2">
                                <div class="bg-surface-800 h-4 w-24 animate-pulse rounded-full"></div>
                                <div class="bg-surface-800 h-3 w-16 animate-pulse rounded-full"></div>
                            </div>
                            <div class="bg-surface-800 h-4 w-[72%] animate-pulse rounded-full"></div>
                            <div class="bg-surface-800 h-4 w-[58%] animate-pulse rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <EventChatPanel v-else-if="canAccessChat" :event="event" mode="page" />
    </div>
</template>
