<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import Drawer from 'primevue/drawer';
import { injectEventView } from '../../../composables/useEventView';
import type { Event } from '../../../types/Event';

const EventChatPanel = defineAsyncComponent(() => import('../../chat/EventChatPanel.vue'));

defineProps<{
    visible: boolean;
    event: Event | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

const { canAccessChat } = injectEventView();
</script>

<template>
    <Drawer
        v-if="canAccessChat"
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        position="right"
        class="w-full sm:w-[520px]!"
        :pt="{
            header: { class: 'hidden' },
            body: { class: 'p-0 flex flex-col overflow-hidden' }
        }"
    >
        <EventChatPanel :event="event" mode="drawer" @close="emit('update:visible', false)" />
    </Drawer>
</template>
