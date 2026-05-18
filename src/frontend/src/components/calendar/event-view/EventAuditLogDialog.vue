<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useRouter } from 'vue-router';
import type { Event } from '../../../types/Event';
import type { AuditLogActionType, AuditLogEntry } from '../../../types/AuditLog';
import API from '../../../services/API';
import UserAvatar from '../../UserAvatar.vue';

type DiffKind = 'added' | 'removed' | 'updated';

type ActionTheme = {
    label: string;
    icon: string;
    bubbleClass: string;
    shellClass: string;
};

type DiffTheme = {
    label: string;
    icon: string;
    rowClass: string;
    badgeClass: string;
};

type DiffItem = {
    fieldName: string;
    beforeText: string;
    afterText: string;
    kind: DiffKind;
};

const props = defineProps<{
    visible: boolean;
    event: Event | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
}>();

const router = useRouter();
const isMobile = ref(false);
let mobileMediaQuery: MediaQueryList | null = null;

const entries = ref<AuditLogEntry[]>([]);
const expandedEntryIds = ref<number[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const requestKey = ref(0);
const displayedEntries = computed(() => [...entries.value].reverse());
const mostRecentEntry = computed(() => displayedEntries.value[0] ?? null);
const totalChangeCount = computed(() =>
    displayedEntries.value.reduce((total, entry) => total + getDiffItems(entry).length, 0)
);
const entryDiffItems = computed(
    () => new Map(displayedEntries.value.map((entry) => [entry.id, getDiffItems(entry)] as const))
);

const showDialog = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value)
});

const dialogPt = computed(() => ({
    root: {
        class: isMobile.value
            ? 'rounded-none border-none!'
            : 'overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]'
    },
    pcMaximizeButton: {
        root: {
            class: isMobile.value ? 'hidden!' : ''
        }
    },
    header: {
        class: 'border-b border-zinc-800/90 bg-zinc-950/95 px-5 py-4 sm:px-6'
    },
    content: {
        class: `h-[92vh] overflow-hidden p-0! ${isMobile.value ? 'w-full' : 'w-[78vw]'}`
    },
    footer: {
        class: 'border-t border-zinc-800/90 bg-zinc-950/95 p-3!'
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
    requestKey.value += 1;
});

const loadAuditLog = async () => {
    if (!props.event?.id) {
        entries.value = [];
        errorMessage.value = null;
        return;
    }

    const nextRequestKey = requestKey.value + 1;
    requestKey.value = nextRequestKey;
    loading.value = true;
    errorMessage.value = null;

    try {
        const response = await API.getEventAuditLog(props.event.id);
        if (requestKey.value !== nextRequestKey) {
            return;
        }

        entries.value = response.data;
    } catch (error: any) {
        if (requestKey.value !== nextRequestKey) {
            return;
        }

        const status = error?.response?.status;
        if (status === 403) {
            await router.replace({ name: 'forbidden' });
            return;
        }

        if (status === 404) {
            await router.replace({ name: 'not-found' });
            return;
        }

        errorMessage.value = error?.response?.data?.message || error?.message || 'Failed to load audit log';
        entries.value = [];
    } finally {
        if (requestKey.value === nextRequestKey) {
            loading.value = false;
        }
    }
};

const retry = () => {
    void loadAuditLog();
};

const isEntryExpanded = (entryId: number) => expandedEntryIds.value.includes(entryId);

const toggleEntry = (entryId: number) => {
    if (isEntryExpanded(entryId)) {
        expandedEntryIds.value = expandedEntryIds.value.filter((id) => id !== entryId);
        return;
    }

    expandedEntryIds.value = [...expandedEntryIds.value, entryId];
};

watch(
    () => [props.visible, props.event?.id],
    ([visible, eventId], previous) => {
        const [previousVisible, previousEventId] = previous ?? [];
        if (!visible) {
            errorMessage.value = null;
            expandedEntryIds.value = [];
            return;
        }

        if (eventId && (!previousVisible || previousEventId !== eventId)) {
            void loadAuditLog();
        }
    },
    { immediate: true }
);

const actionMeta = {
    EVENT_CREATED: {
        label: 'created the event',
        icon: 'pi pi-calendar-plus',
        bubbleClass: 'border-zinc-700/80 bg-zinc-800/90 text-zinc-100',
        shellClass: 'border-zinc-800/90 bg-zinc-950/95'
    },
    EVENT_UPDATED: {
        label: 'updated the event',
        icon: 'pi pi-pencil',
        bubbleClass: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
        shellClass: 'border-sky-500/20 bg-sky-500/10'
    },
    EVENT_DELETED: {
        label: 'deleted the event',
        icon: 'pi pi-trash',
        bubbleClass: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
        shellClass: 'border-rose-500/20 bg-rose-500/10'
    },
    PARTICIPANT_JOINED: {
        label: 'joined the event',
        icon: 'pi pi-user-plus',
        bubbleClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
        shellClass: 'border-emerald-500/20 bg-emerald-500/10'
    },
    PARTICIPANT_DECLINED: {
        label: 'declined the invitation',
        icon: 'pi pi-user-minus',
        bubbleClass: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
        shellClass: 'border-rose-500/20 bg-rose-500/10'
    },
    PARTICIPANT_REMOVED: {
        label: 'was removed from the event',
        icon: 'pi pi-user-minus',
        bubbleClass: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
        shellClass: 'border-rose-500/20 bg-rose-500/10'
    },
    PARTICIPANT_UPDATED: {
        label: 'updated their participation',
        icon: 'pi pi-sliders-h',
        bubbleClass: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
        shellClass: 'border-sky-500/20 bg-sky-500/10'
    },
    PARTICIPANT_INVITED: {
        label: 'invited a user',
        icon: 'pi pi-envelope',
        bubbleClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
        shellClass: 'border-emerald-500/20 bg-emerald-500/10'
    },
    RIDE_ASSIGNED: {
        label: 'assigned a ride',
        icon: 'pi pi-car',
        bubbleClass: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
        shellClass: 'border-sky-500/20 bg-sky-500/10'
    },
    RIDE_UNASSIGNED: {
        label: 'unassigned a ride',
        icon: 'pi pi-times-circle',
        bubbleClass: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
        shellClass: 'border-sky-500/20 bg-sky-500/10'
    }
} satisfies Record<AuditLogActionType, ActionTheme>;

const diffThemes: Record<DiffKind, DiffTheme> = {
    added: {
        label: 'Added',
        icon: 'pi pi-plus-circle',
        rowClass: 'border-emerald-500/20 bg-emerald-500/10',
        badgeClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
    },
    removed: {
        label: 'Removed',
        icon: 'pi pi-minus-circle',
        rowClass: 'border-rose-500/20 bg-rose-500/10',
        badgeClass: 'border-rose-500/20 bg-rose-500/10 text-rose-200'
    },
    updated: {
        label: 'Updated',
        icon: 'pi pi-sync',
        rowClass: 'border-sky-500/20 bg-sky-500/10',
        badgeClass: 'border-sky-500/20 bg-sky-500/10 text-sky-200'
    }
};

const fieldLabels: Record<string, string> = {
    title: 'Title',
    color: 'Color',
    description: 'Description',
    location: 'Location',
    startTime: 'Start time',
    endTime: 'End time',
    hostId: 'Host',
    isOpen: 'Visibility',
    hasAlcohol: 'Alcohol',
    hasFood: 'Food',
    hasSleep: 'Sleep',
    hasWeed: 'Weed',
    alcoholPrice: 'Alcohol price',
    beerPrice: 'Beer price',
    foodPrice: 'Food price',
    hasBeer: 'Beer',
    sleepPrice: 'Sleep price',
    weedPrice: 'Weed price',
    isPrivate: 'Privacy',
    participationDeadline: 'Participation deadline',
    userId: 'User',
    status: 'Status',
    joinedAt: 'Joined at',
    wantsAlcohol: 'Wants alcohol',
    wantsBeer: 'Wants beer',
    wantsFood: 'Wants food',
    wantsSleep: 'Wants sleep',
    wantsWeed: 'Wants weed',
    transportMode: 'Transport mode',
    vehicleSeats: 'Vehicle seats',
    passengerId: 'Passenger',
    driverId: 'Driver',
    username: 'Username'
};

const formatTimestamp = (value: string) => {
    const date = new Date(value);
    const locale = navigator.language || 'en-GB';
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat(locale, {
        timeZone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);

    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${lookup.day} ${lookup.month} ${lookup.year}, ${lookup.hour}:${lookup.minute}`;
};

const formatDiffValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return '(none)';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);
};

const hasField = (record: Record<string, unknown>, field: string) =>
    Object.prototype.hasOwnProperty.call(record, field);

const hasDiffBlock = (entry: AuditLogEntry) => {
    const before = entry.payloadDiff?.before ?? {};
    const after = entry.payloadDiff?.after ?? {};
    return Object.keys(before).length > 0 || Object.keys(after).length > 0;
};

const getDiffTheme = (kind: DiffKind) => diffThemes[kind];

const getDiffLabel = (kind: DiffKind) => getDiffTheme(kind).label;

const getFieldLabel = (fieldName: string) => {
    return (
        fieldLabels[fieldName] ??
        fieldName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase())
    );
};

const getDiffItems = (entry: AuditLogEntry): DiffItem[] => {
    const before = entry.payloadDiff?.before ?? {};
    const after = entry.payloadDiff?.after ?? {};
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

    return keys.map((fieldName) => {
        const beforeExists = hasField(before, fieldName);
        const afterExists = hasField(after, fieldName);
        const beforeValue = beforeExists ? before[fieldName] : undefined;
        const afterValue = afterExists ? after[fieldName] : undefined;
        const beforeIsEmpty = Object.keys(before).length === 0;
        const afterIsEmpty = Object.keys(after).length === 0;

        let kind: DiffKind = 'updated';
        if (!beforeExists || beforeIsEmpty) {
            kind = 'added';
        } else if (!afterExists || afterIsEmpty) {
            kind = 'removed';
        }

        return {
            fieldName,
            beforeText: kind === 'added' ? '(none)' : formatDiffValue(beforeValue),
            afterText: kind === 'removed' ? '(removed)' : formatDiffValue(afterValue),
            kind
        };
    });
};

const getEntryDiffItems = (entry: AuditLogEntry) => entryDiffItems.value.get(entry.id) ?? [];

const getActorLabel = (entry: AuditLogEntry) =>
    entry.impersonatorUsername ? `${entry.impersonatorUsername} (as ${entry.actorUsername})` : entry.actorUsername;
</script>

<template>
    <Dialog
        v-model:visible="showDialog"
        modal
        dismissableMask
        :style="{ width: '78vw', height: '92vh' }"
        :class="isMobile ? 'p-dialog-maximized' : ''"
        header="Audit Log"
        :pt="dialogPt"
        :draggable="false"
    >
        <template #header>
            <div class="flex w-full items-start justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    <div
                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_rgba(9,9,11,1)_72%)] text-sky-300 shadow-[0_12px_28px_-16px_rgba(59,130,246,0.85)]"
                    >
                        <i class="pi pi-list text-sm"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="m-0 text-[10px] font-semibold tracking-[0.28em] text-sky-300 uppercase">
                            Event timeline
                        </p>
                        <h2 class="truncate text-[1.05rem] font-bold text-white sm:text-[1.15rem]">
                            Audit log
                            <span v-if="event" class="text-zinc-500">, {{ event.title }}</span>
                        </h2>
                        <p class="m-0 text-xs text-zinc-500">
                            Most recent activity first, with change details expanded inline.
                        </p>
                    </div>
                </div>

                <div v-if="event" class="hidden min-w-0 flex-wrap items-center justify-end gap-2 sm:flex">
                    <div class="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
                        <i class="pi pi-clock text-[11px] text-sky-300"></i>
                        <span class="text-xs font-semibold text-zinc-200">{{ displayedEntries.length }} entries</span>
                    </div>
                    <div class="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
                        <i class="pi pi-sparkles text-[11px] text-emerald-300"></i>
                        <span class="text-xs font-semibold text-zinc-200">{{ totalChangeCount }} changes</span>
                    </div>
                    <div
                        v-if="mostRecentEntry"
                        class="flex max-w-[18rem] items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5"
                    >
                        <i class="pi pi-calendar text-[11px] text-zinc-400"></i>
                        <span class="truncate text-xs text-zinc-400">{{
                            formatTimestamp(mostRecentEntry.createdAt)
                        }}</span>
                    </div>
                </div>
            </div>
        </template>

        <div
            class="relative flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(180deg,_rgba(9,9,11,0.92)_0%,_rgba(0,0,0,1)_100%)]"
        >
            <div
                class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/15 to-transparent"
            ></div>

            <div v-if="loading" class="flex flex-1 items-center justify-center px-8">
                <div
                    class="flex w-full max-w-md flex-col items-center gap-5 rounded-[32px] border border-zinc-800/80 bg-zinc-950/90 px-8 py-10 text-center shadow-[0_20px_60px_-28px_rgba(0,0,0,0.9)]"
                >
                    <div
                        class="flex h-16 w-16 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300"
                    >
                        <ProgressSpinner style="width: 34px; height: 34px" strokeWidth="3" />
                    </div>
                    <div class="space-y-1">
                        <p class="m-0 text-sm font-semibold text-white">Loading audit log</p>
                        <p class="m-0 text-xs text-zinc-500">Fetching the event timeline and diff history.</p>
                    </div>
                </div>
            </div>

            <div
                v-else-if="errorMessage"
                class="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-10 text-center"
            >
                <div
                    class="flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-300 shadow-[0_16px_42px_-24px_rgba(244,63,94,0.8)]"
                >
                    <i class="pi pi-exclamation-triangle text-3xl"></i>
                </div>
                <div class="max-w-md space-y-2 rounded-[28px] border border-zinc-800/80 bg-zinc-950/75 px-6 py-5">
                    <h3 class="text-xl font-bold text-white">Could not load audit log</h3>
                    <p class="text-zinc-400">{{ errorMessage }}</p>
                </div>
                <Button label="Retry" icon="pi pi-refresh" severity="secondary" @click="retry" />
            </div>

            <div
                v-else-if="entries.length === 0"
                class="flex flex-1 items-center justify-center px-8 py-10 text-center"
            >
                <div
                    class="max-w-md space-y-4 rounded-[32px] border border-zinc-800/80 bg-zinc-950/80 px-8 py-10 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)]"
                >
                    <div
                        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300"
                    >
                        <i class="pi pi-clock text-2xl"></i>
                    </div>
                    <div class="space-y-2">
                        <h3 class="text-lg font-semibold text-white">No activity yet</h3>
                        <p class="m-0 text-zinc-400">
                            This event has not recorded any changes yet. Once someone updates the details, the timeline
                            will appear here.
                        </p>
                    </div>
                </div>
            </div>

            <div v-else class="flex-1 overflow-y-auto px-3 pt-3 pb-4 sm:px-4">
                <div
                    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-zinc-800/80 bg-zinc-950/85 px-4 py-3"
                >
                    <div class="min-w-0">
                        <p class="m-0 text-[10px] font-semibold tracking-[0.26em] text-zinc-500 uppercase">
                            Timeline overview
                        </p>
                        <p class="m-0 truncate text-sm text-zinc-300">
                            {{ displayedEntries.length }} recorded event{{
                                displayedEntries.length === 1 ? '' : 's'
                            }}
                            and {{ totalChangeCount }} field change{{ totalChangeCount === 1 ? '' : 's' }}.
                        </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <div
                            class="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-zinc-400 uppercase"
                        >
                            Activity feed
                        </div>
                        <div
                            class="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-sky-200 uppercase"
                        >
                            Newest first
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <article
                        v-for="entry in displayedEntries"
                        :key="entry.id"
                        class="group relative overflow-hidden rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(180deg,_rgba(12,12,13,0.96)_0%,_rgba(9,9,11,0.98)_100%)] px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_-32px_rgba(0,0,0,0.95)] transition will-change-transform hover:-translate-y-0.5 hover:border-zinc-700"
                        :class="actionMeta[entry.actionType].shellClass"
                    >
                        <div
                            class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        ></div>

                        <div class="flex gap-3.5">
                            <div class="flex shrink-0 flex-col items-center gap-2 pt-0.5">
                                <div
                                    class="flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)]"
                                    :class="actionMeta[entry.actionType].bubbleClass"
                                >
                                    <i :class="`${actionMeta[entry.actionType].icon} text-sm`"></i>
                                </div>
                                <div
                                    class="hidden h-full w-px bg-gradient-to-b from-zinc-700/70 via-zinc-800/40 to-transparent sm:block"
                                ></div>
                            </div>

                            <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-start justify-between gap-3">
                                    <div class="flex min-w-0 items-start gap-3">
                                        <UserAvatar
                                            :username="entry.impersonatorUsername || entry.actorUsername"
                                            size="normal"
                                        />
                                        <div class="min-w-0 space-y-1">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <p class="m-0 truncate text-sm font-semibold text-white">
                                                    {{ getActorLabel(entry) }}
                                                </p>
                                                <span
                                                    v-if="entry.impersonatorUsername"
                                                    class="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-200 uppercase"
                                                >
                                                    impersonated
                                                </span>
                                            </div>
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span
                                                    class="rounded-full border border-zinc-800 bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-zinc-300 uppercase"
                                                >
                                                    {{ actionMeta[entry.actionType].label }}
                                                </span>
                                                <span class="text-xs text-zinc-500">
                                                    by {{ entry.actorUsername }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex flex-col items-end gap-1 text-right">
                                        <span
                                            class="rounded-full border border-zinc-800 bg-black/30 px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase"
                                        >
                                            {{ formatTimestamp(entry.createdAt) }}
                                        </span>
                                        <button
                                            type="button"
                                            class="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                                            @click="toggleEntry(entry.id)"
                                        >
                                            <i
                                                :class="
                                                    isEntryExpanded(entry.id)
                                                        ? 'pi pi-chevron-up'
                                                        : 'pi pi-chevron-down'
                                                "
                                            ></i>
                                            {{ isEntryExpanded(entry.id) ? 'Collapse' : 'Expand' }}
                                        </button>
                                    </div>
                                </div>

                                <div class="mt-4">
                                    <div
                                        v-if="hasDiffBlock(entry) && !isEntryExpanded(entry.id)"
                                        class="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-400"
                                    >
                                        <i class="pi pi-eye text-[11px] text-sky-300"></i>
                                        <span
                                            >{{ getEntryDiffItems(entry).length }} change{{
                                                getEntryDiffItems(entry).length === 1 ? '' : 's'
                                            }}
                                            hidden</span
                                        >
                                    </div>

                                    <div v-else-if="hasDiffBlock(entry)" class="grid gap-2">
                                        <div
                                            v-for="item in getEntryDiffItems(entry)"
                                            :key="item.fieldName"
                                            class="flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm leading-6 not-italic"
                                            :class="getDiffTheme(item.kind).rowClass"
                                        >
                                            <span
                                                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] uppercase"
                                                :class="getDiffTheme(item.kind).badgeClass"
                                            >
                                                <i :class="`${getDiffTheme(item.kind).icon} text-[10px]`"></i>
                                                {{ getDiffLabel(item.kind) }}
                                            </span>
                                            <span
                                                class="inline-flex items-center rounded-full border border-zinc-800 bg-black/40 px-2.5 py-0.5 text-[12px] font-semibold text-zinc-200"
                                            >
                                                {{ getFieldLabel(item.fieldName) }}
                                            </span>
                                            <span class="text-zinc-400">from</span>
                                            <strong class="font-semibold text-white">{{ item.beforeText }}</strong>
                                            <span class="text-zinc-400">to</span>
                                            <strong class="font-semibold text-white">{{ item.afterText }}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    </Dialog>
</template>
