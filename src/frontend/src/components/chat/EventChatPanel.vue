<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';
import { useRouter } from 'vue-router';
import UserAvatar from '../UserAvatar.vue';
import type { Event as CalendarEvent } from '../../types/Event';
import type { ChatMessage } from '../../types/Chat';
import { useEventChat } from '../../composables/useEventChat';
import { useSessionStore } from '../../stores/session';
import { uploadsBaseURL } from '../../services/API';
import API from '../../services/API';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
    event: CalendarEvent | null;
    mode?: 'page' | 'drawer';
}>();

defineEmits<{
    (e: 'close'): void;
}>();

const router = useRouter();
const sessionStore = useSessionStore();
const confirm = useConfirm();
const toast = useToast();

const chat = useEventChat(computed(() => props.event?.id ?? null));
const messagesContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const selectedFilePreviewUrl = ref<string | null>(null);
const draftText = ref('');
const typingTimer = ref<ReturnType<typeof window.setTimeout> | null>(null);
const editingMessageId = ref<number | null>(null);
const editingDraft = ref('');
const reactionPickerMessageId = ref<number | null>(null);
const suppressAutoScroll = ref(false);
const isScrolledToBottom = ref(true);
const chatInitialized = ref(false);
const isChatMuted = ref(false);
const muteStateLoading = ref(false);

const isEditDialogVisible = computed({
    get: () => editingMessageId.value !== null,
    set: (visible: boolean) => {
        if (!visible) {
            editingMessageId.value = null;
            editingDraft.value = '';
        }
    }
});

const emojiChoices = ['👍', '❤️', '😂', '🎉', '🔥', '🙏'];

const currentUserId = computed(() => sessionStore.currentUser?.id ?? null);
const currentUserIsAdmin = computed(() => !!sessionStore.currentUser?.isAdmin);
const currentEventHostId = computed(() => props.event?.hostId ?? null);
const canModerate = computed(
    () => currentUserIsAdmin.value || (currentUserId.value != null && currentUserId.value === currentEventHostId.value)
);

const title = computed(() => props.event?.title || 'Event Chat');
const subtitle = computed(() => {
    if (!props.event) return 'Live chat';
    return `${chat.connected.value ? 'Connected' : 'Connecting'} · ${chat.messages.value.length} messages`;
});

const sortedPinnedMessages = computed(() => [...chat.pinnedMessages.value].sort(sortByDateAsc));

const timelineRows = computed(() => {
    const rows: Array<{ type: 'divider'; label: string } | { type: 'message'; message: ChatMessage }> = [];
    let lastLabel: string | null = null;

    for (const message of chat.messages.value) {
        const label = getDateLabel(message.createdAt);
        if (label !== lastLabel) {
            rows.push({ type: 'divider', label });
            lastLabel = label;
        }

        rows.push({ type: 'message', message });
    }

    return rows;
});

const previewFileLabel = computed(() => selectedFile.value?.name || '');
const previewFileType = computed(() => selectedFile.value?.type || '');

const scrollToBottom = async () => {
    await nextTick();
    const container = messagesContainer.value;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    isScrolledToBottom.value = true;
};

const scrollToMessage = async (messageId: number) => {
    await nextTick();
    const element = messagesContainer.value?.querySelector(`[data-message-id="${messageId}"]`);
    if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

const closePicker = () => {
    reactionPickerMessageId.value = null;
};

const onPickEmoji = (messageId: number, emoji: string) => {
    chat.toggleReaction(messageId, emoji);
    reactionPickerMessageId.value = null;
};

const openEditDialog = (messageId: number) => {
    const message = chat.messages.value.find((item) => item.id === messageId);
    if (!message) return;
    editingMessageId.value = messageId;
    editingDraft.value = message.text || '';
};

const saveEdit = () => {
    if (!editingMessageId.value) return;
    const nextText = editingDraft.value.trim();
    if (!nextText) {
        toast.add({
            severity: 'warn',
            summary: 'Empty message',
            detail: 'Edited messages need some text.',
            life: 3000
        });
        return;
    }

    chat.editMessage(editingMessageId.value, nextText);
    editingMessageId.value = null;
    editingDraft.value = '';
};

const confirmDelete = (messageId: number) => {
    confirm.require({
        message: 'Delete this message? This cannot be undone.',
        header: 'Delete Message',
        icon: 'pi pi-trash',
        rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
        acceptProps: { label: 'Delete', severity: 'danger' },
        accept: () => chat.deleteMessage(messageId)
    });
};

const togglePin = (messageId: number, isPinned: boolean) => {
    if (isPinned) {
        chat.unpinMessage(messageId);
    } else {
        chat.pinMessage(messageId);
    }
};

const chooseFile = (event: globalThis.Event) => {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    selectedFile.value = file;

    if (selectedFilePreviewUrl.value) {
        URL.revokeObjectURL(selectedFilePreviewUrl.value);
        selectedFilePreviewUrl.value = null;
    }

    if (file && file.type.startsWith('image/')) {
        selectedFilePreviewUrl.value = URL.createObjectURL(file);
    }
};

const clearSelectedFile = () => {
    selectedFile.value = null;
    if (selectedFilePreviewUrl.value) {
        URL.revokeObjectURL(selectedFilePreviewUrl.value);
        selectedFilePreviewUrl.value = null;
    }
};

const emitTyping = () => {
    chat.startTyping();

    if (typingTimer.value) {
        window.clearTimeout(typingTimer.value);
    }

    typingTimer.value = window.setTimeout(() => {
        chat.stopTyping();
    }, 1200);
};

const sendCurrentMessage = async () => {
    const text = draftText.value.trim();
    if (!text && !selectedFile.value) return;

    try {
        await chat.sendMessage(text, selectedFile.value ? { file: selectedFile.value } : undefined);
        draftText.value = '';
        clearSelectedFile();
        chat.stopTyping();
        await scrollToBottom();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Chat error',
            detail: error instanceof Error ? error.message : 'Failed to send message',
            life: 4000
        });
    }
};

const loadOlderMessages = async () => {
    const container = messagesContainer.value;
    if (!container) {
        await chat.loadMoreHistory();
        return;
    }

    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;
    suppressAutoScroll.value = true;
    await chat.loadMoreHistory();
    await nextTick();
    container.scrollTop = previousTop + (container.scrollHeight - previousHeight);
};

const onScroll = () => {
    const container = messagesContainer.value;
    if (!container) return;
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    isScrolledToBottom.value = remaining < 120;
};

watch(
    () => chat.messages.value.length,
    async () => {
        if (suppressAutoScroll.value) {
            suppressAutoScroll.value = false;
            return;
        }

        if (isScrolledToBottom.value) {
            await scrollToBottom();
        }
    }
);

watch(
    () => chat.connectionError.value,
    (error) => {
        if (!error) return;
        toast.add({
            severity: 'warn',
            summary: 'Chat connection',
            detail: error,
            life: 4000
        });
    }
);

watch(
    () => chat.loadingHistory.value,
    (isLoading, wasLoading) => {
        if (wasLoading && !isLoading) {
            chatInitialized.value = true;
        }
    }
);

watch(
    () => chat.messages.value[chat.messages.value.length - 1]?.id,
    (messageId, previousMessageId) => {
        if (!chatInitialized.value || !messageId || messageId === previousMessageId) return;

        const message = chat.messages.value[chat.messages.value.length - 1];
        if (!message || message.authorId === currentUserId.value) return;

        toast.add({
            severity: 'info',
            summary: `${message.authorUsername} sent a message`,
            detail: message.text || (message.mediaType ? `${message.mediaType} attachment` : 'New chat activity'),
            life: 3500
        });

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
            new Notification(`New message from ${message.authorUsername}`, {
                body:
                    message.text ||
                    (message.mediaType ? `${message.mediaType} attachment` : 'Open the chat to view it'),
                tag: `chat-message-${message.id}`
            });
        }
    }
);

onBeforeUnmount(() => {
    if (typingTimer.value) {
        window.clearTimeout(typingTimer.value);
    }

    if (selectedFilePreviewUrl.value) {
        URL.revokeObjectURL(selectedFilePreviewUrl.value);
    }

    chat.stopTyping();
});

function getDateLabel(value: string | Date) {
    const date = typeof value === 'string' ? parseISO(value) : value;
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, d MMMM');
}

function formatMessageTime(value: string | Date) {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return formatDistanceToNowStrict(date, { addSuffix: true });
}

function sortByDateAsc<T extends { createdAt: string | Date }>(a: T, b: T) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function resolveMediaUrl(mediaUrl: string | null) {
    if (!mediaUrl) return '';
    if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
    const base = uploadsBaseURL.replace(/\/$/, '');
    return `${base}/${mediaUrl.replace(/^\//, '')}`;
}

function getMediaKind(mediaType: string | null) {
    return mediaType || 'file';
}

const triggerFilePicker = () => {
    fileInput.value?.click();
};

const loadMuteState = async () => {
    if (!props.event?.id) {
        isChatMuted.value = false;
        return;
    }

    try {
        const response = await API.getMutedChatEvents();
        isChatMuted.value = response.data.includes(props.event.id);
    } catch {
        isChatMuted.value = false;
    }
};

const handleMuteToggle = async (nextValue: boolean) => {
    if (!props.event?.id || muteStateLoading.value) {
        return;
    }

    const previousValue = isChatMuted.value;
    isChatMuted.value = nextValue;
    muteStateLoading.value = true;

    try {
        if (nextValue) {
            await API.muteChatNotifications(props.event.id);
        } else {
            await API.unmuteChatNotifications(props.event.id);
        }
    } catch {
        isChatMuted.value = previousValue;
        toast.add({
            severity: 'error',
            summary: 'Chat mute',
            detail: nextValue ? 'Failed to mute chat notifications' : 'Failed to unmute chat notifications',
            life: 4000
        });
    } finally {
        muteStateLoading.value = false;
    }
};

watch(
    () => props.event?.id,
    async () => {
        await loadMuteState();
    },
    { immediate: true }
);
</script>

<template>
    <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-transparent">
        <header
            class="bg-surface-950/95 sticky top-0 z-20 flex items-center gap-3 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.04)]"
        >
            <Button
                v-if="mode !== 'drawer'"
                icon="pi pi-arrow-left"
                text
                rounded
                severity="secondary"
                @click="router.back()"
            />
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                    <h2 class="truncate text-lg font-bold">{{ title }}</h2>
                    <Tag v-if="chat.connected.value" severity="success" value="Live" />
                </div>
                <p class="text-surface-500 m-0 text-xs">{{ subtitle }}</p>
            </div>
            <div v-if="props.event" class="border-surface-800/80 flex items-center gap-2 rounded-full border px-3 py-2">
                <span class="text-surface-400 text-xs font-semibold tracking-wide">Mute chat</span>
                <ToggleSwitch
                    :modelValue="isChatMuted"
                    :disabled="muteStateLoading"
                    @update:modelValue="handleMuteToggle"
                />
            </div>
            <Button
                v-if="chat.hasMore.value"
                label="Older"
                icon="pi pi-arrow-up"
                severity="secondary"
                text
                size="small"
                @click="loadOlderMessages"
                :loading="chat.loadingMore.value"
            />
        </header>

        <section
            v-if="sortedPinnedMessages.length"
            class="bg-surface-950/70 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.03)]"
        >
            <div class="mb-2 flex items-center gap-2 text-amber-200">
                <i class="pi pi-thumbtack"></i>
                <span class="text-sm font-semibold">Pinned messages</span>
            </div>
            <div class="flex gap-2 overflow-x-auto pb-1">
                <button
                    v-for="message in sortedPinnedMessages"
                    :key="message.id"
                    class="bg-surface-900/90 min-w-[220px] rounded-2xl p-3 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition hover:shadow-[0_0_0_1px_rgba(59,130,246,0.22)]"
                    @click="scrollToMessage(message.id)"
                >
                    <div class="mb-1 flex items-center justify-between gap-2">
                        <span class="truncate text-sm font-semibold">{{ message.authorUsername }}</span>
                        <span class="text-surface-500 text-[11px]">{{ formatMessageTime(message.createdAt) }}</span>
                    </div>
                    <p class="text-surface-300 m-0 line-clamp-2 text-xs">
                        {{ message.text || `${message.mediaType || 'media'} message` }}
                    </p>
                </button>
            </div>
        </section>

        <div class="relative min-h-0 flex-1">
            <div ref="messagesContainer" class="bg-surface-950/80 h-full overflow-y-auto px-4 py-4" @scroll="onScroll">
                <div
                    v-if="chat.loadingHistory.value && !chat.messages.value.length"
                    class="flex h-full items-center justify-center py-24"
                >
                    <div class="text-surface-500 flex items-center gap-3">
                        <i class="pi pi-spin pi-spinner text-xl"></i>
                        <span>Loading chat…</span>
                    </div>
                </div>

                <div v-else-if="chat.messages.value.length" class="space-y-4">
                    <div
                        v-for="row in timelineRows"
                        :key="row.type === 'divider' ? `divider-${row.label}` : `message-${row.message.id}`"
                    >
                        <div v-if="row.type === 'divider'" class="py-1.5 text-center">
                            <span
                                class="border-surface-800/80 bg-surface-950/95 text-surface-400 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase"
                            >
                                {{ row.label }}
                            </span>
                        </div>

                        <article
                            v-else
                            :data-message-id="row.message.id"
                            class="group flex gap-2.5 rounded-2xl p-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.035)] transition"
                            :class="
                                row.message.authorId === currentUserId
                                    ? 'bg-primary-500/12 shadow-[0_0_0_1px_rgba(59,130,246,0.18)]'
                                    : 'bg-surface-900/95'
                            "
                        >
                            <UserAvatar
                                :username="row.message.authorUsername"
                                :profilePicture="undefined"
                                class="shrink-0"
                            />
                            <div class="min-w-0 flex-1">
                                <div class="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span class="truncate text-sm font-bold">{{ row.message.authorUsername }}</span>
                                    <span class="text-surface-500 text-[11px]">{{
                                        formatMessageTime(row.message.createdAt)
                                    }}</span>
                                    <Tag v-if="row.message.isPinned" severity="warning" value="Pinned" />
                                    <Tag v-if="row.message.isEdited" severity="info" value="Edited" />
                                </div>

                                <div class="space-y-2.5">
                                    <div
                                        v-if="row.message.text"
                                        class="rounded-xl bg-black/10 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                                    >
                                        {{ row.message.text }}
                                    </div>

                                    <div
                                        v-if="row.message.mediaUrl"
                                        class="overflow-hidden rounded-xl bg-black/25 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                                    >
                                        <template
                                            v-if="
                                                getMediaKind(row.message.mediaType) === 'image' ||
                                                getMediaKind(row.message.mediaType) === 'gif'
                                            "
                                        >
                                            <img
                                                :src="resolveMediaUrl(row.message.mediaUrl)"
                                                class="max-h-[340px] w-full object-cover"
                                                :alt="row.message.mediaType || 'chat media'"
                                            />
                                        </template>
                                        <template v-else-if="getMediaKind(row.message.mediaType) === 'video'">
                                            <video
                                                :src="resolveMediaUrl(row.message.mediaUrl)"
                                                controls
                                                class="w-full max-w-full"
                                            />
                                        </template>
                                        <template v-else-if="getMediaKind(row.message.mediaType) === 'audio'">
                                            <audio
                                                :src="resolveMediaUrl(row.message.mediaUrl)"
                                                controls
                                                class="w-full"
                                            />
                                        </template>
                                        <a
                                            v-else
                                            :href="resolveMediaUrl(row.message.mediaUrl)"
                                            target="_blank"
                                            rel="noreferrer"
                                            class="text-primary-300 block px-3 py-2 text-sm underline"
                                        >
                                            Open attachment
                                        </a>
                                    </div>

                                    <div v-if="row.message.reactions.length" class="flex flex-wrap gap-2">
                                        <button
                                            v-for="reaction in row.message.reactions"
                                            :key="`${row.message.id}-${reaction.emoji}`"
                                            class="bg-surface-900/95 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition hover:shadow-[0_0_0_1px_rgba(59,130,246,0.22)]"
                                            @click="onPickEmoji(row.message.id, reaction.emoji)"
                                        >
                                            <span class="font-emoji">{{ reaction.emoji }}</span>
                                            <span>{{ reaction.count }}</span>
                                        </button>
                                    </div>

                                    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        <Button
                                            text
                                            size="small"
                                            severity="secondary"
                                            icon="pi pi-smile"
                                            label="React"
                                            @click="
                                                reactionPickerMessageId =
                                                    reactionPickerMessageId === row.message.id ? null : row.message.id
                                            "
                                        />
                                        <Button
                                            v-if="row.message.authorId === currentUserId"
                                            text
                                            size="small"
                                            severity="secondary"
                                            icon="pi pi-pencil"
                                            label="Edit"
                                            @click="openEditDialog(row.message.id)"
                                        />
                                        <Button
                                            v-if="canModerate"
                                            text
                                            size="small"
                                            severity="secondary"
                                            :icon="row.message.isPinned ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                                            :label="row.message.isPinned ? 'Unpin' : 'Pin'"
                                            @click="togglePin(row.message.id, row.message.isPinned)"
                                        />
                                        <Button
                                            v-if="row.message.authorId === currentUserId || canModerate"
                                            text
                                            size="small"
                                            severity="danger"
                                            icon="pi pi-trash"
                                            label="Delete"
                                            @click="confirmDelete(row.message.id)"
                                        />
                                    </div>

                                    <div
                                        v-if="reactionPickerMessageId === row.message.id"
                                        class="bg-surface-950/95 flex flex-wrap gap-2 rounded-2xl p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                                    >
                                        <button
                                            v-for="emoji in emojiChoices"
                                            :key="`${row.message.id}-picker-${emoji}`"
                                            class="rounded-full px-3 py-1 text-sm transition hover:bg-white/10"
                                            @click="onPickEmoji(row.message.id, emoji)"
                                        >
                                            <span class="font-emoji">{{ emoji }}</span>
                                        </button>
                                        <button
                                            class="text-surface-400 ml-auto rounded-full px-3 py-1 text-sm transition hover:bg-white/10"
                                            @click="closePicker"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>

                <div
                    v-else
                    class="text-surface-500 flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-sm"
                >
                    <i class="pi pi-comments text-3xl"></i>
                    <p class="text-surface-300 m-0 font-semibold">No messages yet</p>
                    <p class="m-0 max-w-sm">Start the conversation with a message, photo, video, or audio clip.</p>
                </div>
            </div>

            <div
                v-if="chat.typingUsers.value.length"
                class="bg-surface-950/95 absolute inset-x-4 bottom-4 rounded-full px-4 py-2 text-xs shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            >
                <span v-for="(user, index) in chat.typingUsers.value" :key="user.userId">
                    {{ user.username }}{{ index < chat.typingUsers.value.length - 1 ? ', ' : '' }}
                </span>
                <span class="text-surface-500">typing…</span>
            </div>
        </div>

        <footer class="bg-surface-950/95 p-3 shadow-[0_-1px_0_rgba(255,255,255,0.04)]">
            <div
                v-if="selectedFile"
                class="bg-surface-900/95 mb-3 rounded-2xl p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            >
                <div class="flex items-start gap-3">
                    <div class="flex-1">
                        <p class="m-0 text-sm font-semibold">{{ previewFileLabel }}</p>
                        <p class="text-surface-500 m-0 text-xs">{{ previewFileType || 'attachment' }}</p>
                    </div>
                    <Button icon="pi pi-times" text rounded severity="secondary" @click="clearSelectedFile" />
                </div>
                <div
                    v-if="selectedFilePreviewUrl"
                    class="mt-3 overflow-hidden rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                >
                    <img :src="selectedFilePreviewUrl" alt="Selected preview" class="max-h-44 w-full object-cover" />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <div class="flex items-end gap-2">
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
                        v-model="draftText"
                        auto-resize
                        rows="1"
                        placeholder="Type a message, share a photo, or drop a clip…"
                        class="bg-surface-900 max-h-24 min-h-11 flex-1 rounded-2xl! px-3! py-2! text-sm! shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
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
        </footer>

        <Dialog
            v-model:visible="isEditDialogVisible"
            modal
            header="Edit message"
            :style="{ width: 'min(36rem, calc(100vw - 2rem))' }"
            :dismissableMask="true"
        >
            <div class="flex flex-col gap-3">
                <Textarea v-model="editingDraft" auto-resize rows="4" class="w-full rounded-2xl!" />
                <div class="flex justify-end gap-2">
                    <Button label="Cancel" severity="secondary" text @click="editingMessageId = null" />
                    <Button label="Save" icon="pi pi-check" @click="saveEdit" />
                </div>
            </div>
        </Dialog>
    </div>
</template>
