<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import { useRoute, useRouter } from 'vue-router';
import type { Event } from '../../../types/Event';
import EventChatPanel from '../../chat/EventChatPanel.vue';
import { useEventChatDialogState } from './chat/useEventChatDialogState';

const props = defineProps<{
    visible: boolean;
    event: Event | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

const route = useRoute();
const router = useRouter();
const isMobile = ref(false);
let mobileMediaQuery: MediaQueryList | null = null;

const currentSection = computed(() =>
    route.name === 'upcoming' || route.path.startsWith('/upcoming/') ? 'upcoming' : 'calendar'
);
const currentEventPath = computed(() => {
    const eventId = props.event?.id ?? parseEventId(route.params.id);
    if (!eventId) return currentSection.value === 'upcoming' ? '/upcoming' : '/event';

    return `${currentSection.value === 'upcoming' ? '/upcoming' : '/event'}/${eventId}`;
});

const closeChat = () => {
    if (!props.event) {
        void router.back();
        return;
    }

    void router.replace({ path: currentEventPath.value });
};

const chatState = useEventChatDialogState(toRef(props, 'event'), closeChat);
const {
    title,
    subtitle,
    chat,
    isChatMuted,
    muteStateLoading,
    draftText,
    selectedFile,
    selectedFilePreviewUrl,
    previewFileLabel,
    previewFileType,
    fileInput,
    setDraftText,
    chooseFile,
    triggerFilePicker,
    clearSelectedFile,
    emitTyping,
    sendCurrentMessage,
    handleMuteToggle,
    loadOlderMessages
} = chatState;

void title;
void subtitle;
void chat;
void isChatMuted;
void muteStateLoading;
void draftText;
void selectedFile;
void selectedFilePreviewUrl;
void previewFileLabel;
void previewFileType;
void fileInput;
void setDraftText;
void chooseFile;
void triggerFilePicker;
void clearSelectedFile;
void emitTyping;
void sendCurrentMessage;
void handleMuteToggle;
void loadOlderMessages;

const showDialog = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const dialogPt = computed(() => ({
    root: {
        class: isMobile.value ? 'rounded-none' : 'rounded-2xl border border-zinc-800 shadow-2xl'
    },
    pcMaximizeButton: {
        root: {
            class: isMobile.value ? 'hidden!' : ''
        }
    },
    header: {
        class: 'border-b border-zinc-800'
    },
    content: {
        class: `h-[95vh] p-0! ${isMobile.value ? 'w-full' : 'w-[70vw]'}`
    },
    footer: {
        class: 'p-3!'
    }
}));

const syncIsMobile = (source?: MediaQueryList | MediaQueryListEvent) => {
    isMobile.value = source?.matches ?? mobileMediaQuery?.matches ?? false;
};

onMounted(() => {
    mobileMediaQuery = window.matchMedia('(max-width: 767px)');
    syncIsMobile(mobileMediaQuery);
    mobileMediaQuery.addEventListener('change', syncIsMobile);
});

onBeforeUnmount(() => {
    mobileMediaQuery?.removeEventListener('change', syncIsMobile);
});

function parseEventId(value: unknown) {
    if (Array.isArray(value)) {
        return parseEventId(value[0]);
    }

    if (typeof value !== 'string' || value.length === 0) {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}
</script>

<template>
    <Dialog
        v-model:visible="showDialog"
        modal
        dismissableMask
        :class="isMobile ? 'p-dialog-maximized' : ''"
        :header="event ? `Chat · ${event.title}` : 'Chat'"
        :pt="dialogPt"
        :draggable="false"
    >
        <template #header>
            <div class="flex w-full items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h2 class="truncate text-lg font-bold">{{ title }}</h2>
                            <Tag v-if="chat.connected.value" severity="success" value="Live" />
                        </div>
                        <p class="m-0 text-xs text-zinc-500">{{ subtitle }}</p>
                    </div>
                </div>

                <div v-if="chatState.canAccessChat.value" class="flex items-center gap-2">
                    <Button
                        :icon="isChatMuted ? 'pi pi-bell' : 'pi pi-bell-slash'"
                        text
                        rounded
                        severity="secondary"
                        @click="() => handleMuteToggle(!isChatMuted)"
                    />
                    <Button
                        v-if="chatState.chat.hasMore.value"
                        label="Older"
                        icon="pi pi-arrow-up"
                        severity="secondary"
                        text
                        size="small"
                        @click="loadOlderMessages"
                        :loading="chatState.chat.loadingMore.value"
                    />
                </div>
            </div>
        </template>

        <div v-if="event" class="flex h-full min-h-0 flex-col overflow-hidden">
            <template v-if="chatState.canAccessChat.value">
                <EventChatPanel />
            </template>
            <div
                v-else
                class="bg-surface-950/80 flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
            >
                <div class="bg-primary-500/10 flex h-20 w-20 items-center justify-center rounded-full">
                    <i class="pi pi-lock text-primary-400 text-3xl"></i>
                </div>
                <div class="max-w-md space-y-2">
                    <h3 class="text-xl font-bold text-white">Participants Only</h3>
                    <p class="text-zinc-400">
                        The chat is only available to confirmed participants and the host. Please accept the invitation
                        to join the conversation.
                    </p>
                </div>
                <Button
                    label="Back to Event"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    text
                    @click="closeChat"
                    class="mt-4"
                />
            </div>
        </div>

        <div v-else class="flex h-[60vh] items-center justify-center">
            <i class="pi pi-spin pi-spinner text-2xl text-zinc-500"></i>
        </div>

        <template v-if="chatState.canAccessChat.value" #footer>
            <div class="w-full">
                <div v-if="selectedFile" class="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                    <div class="flex items-start gap-3">
                        <div class="flex-1">
                            <p class="m-0 text-sm font-semibold">{{ previewFileLabel }}</p>
                            <p class="m-0 text-xs text-zinc-500">{{ previewFileType || 'attachment' }}</p>
                        </div>
                        <Button icon="pi pi-times" text rounded severity="secondary" @click="clearSelectedFile" />
                    </div>
                    <div v-if="selectedFilePreviewUrl" class="mt-3 overflow-hidden rounded-xl border border-zinc-800">
                        <img
                            :src="selectedFilePreviewUrl"
                            alt="Selected preview"
                            class="max-h-44 w-full object-cover"
                        />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-2">
                        <input
                            ref="fileInput"
                            id="chat-upload"
                            type="file"
                            class="hidden"
                            accept="image/*,video/*,audio/*"
                            @change="chooseFile"
                        />
                        <Button icon="pi pi-paperclip" text rounded severity="secondary" @click="triggerFilePicker" />
                        <Textarea
                            :modelValue="draftText"
                            auto-resize
                            rows="1"
                            placeholder="Type a message, share a photo, or drop a clip…"
                            class="max-h-24 min-h-11 flex-1 rounded-2xl! px-3! py-2! text-sm!"
                            @update:modelValue="setDraftText"
                            @input="emitTyping"
                            @blur="chat.stopTyping()"
                            @keyup.enter.exact.prevent="sendCurrentMessage"
                        />
                        <Button
                            icon="pi pi-send"
                            rounded
                            :loading="chat.sending.value"
                            :disabled="!draftText.trim() && !selectedFile"
                            @click="sendCurrentMessage"
                        />
                    </div>
                </div>
            </div>
        </template>
    </Dialog>
</template>
