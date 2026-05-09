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

const { canAccessChat } = useChatAccess(event);

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
    [event, () => sessionStore.currentUser?.id],
    () => {
        const id = Number(route.params.id);
        if (!Number.isNaN(id) && event.value && !canAccessChat.value) {
            router.replace({ name: 'calendar', query: { event: String(id) } });
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 h-[100dvh]">
        <EventChatPanel v-if="canAccessChat" :event="event" mode="page" />
    </div>
</template>
