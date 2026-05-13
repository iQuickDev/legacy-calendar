<script setup lang="ts">
import { injectEventChatDialogState } from '../calendar/event-view/chat/useEventChatDialogState';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import UserAvatar from '../UserAvatar.vue';

const chatState = injectEventChatDialogState();
const {
    messagesContainer,
    chat,
    sortedPinnedMessages,
    timelineRows,
    currentUserId,
    canModerate,
    formatMessageTime,
    resolveMediaUrl,
    getMediaKind,
    scrollToMessage,
    onScroll,
    onPickEmoji,
    reactionPickerMessageId,
    emojiChoices,
    closePicker,
    toggleReactionPicker,
    openEditDialog,
    confirmDelete,
    togglePin,
    isEditDialogVisible,
    editingDraft,
    saveEdit,
    closeEditDialog
} = chatState;

void messagesContainer;
</script>

<template>
    <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-transparent">
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
                                class="rounded-full border border-zinc-800/80 bg-zinc-950/95 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase"
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
                                            @click="toggleReactionPicker(row.message.id)"
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
                    <Button label="Cancel" severity="secondary" text @click="closeEditDialog" />
                    <Button label="Save" icon="pi pi-check" @click="saveEdit" />
                </div>
            </div>
        </Dialog>
    </div>
</template>
