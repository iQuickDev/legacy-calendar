<script setup lang="ts">
import { computed } from 'vue';
import type { Event, EventFeature } from '../../../types/Event';
import { FEATURES } from '../../../constants/features';
import { formatCurrency } from '../../../utils/format';
import { injectEventView } from '../../../composables/useEventView';

defineProps<{
    event: Event;
}>();

const {
    userParticipantStatus,
    userTotalShare,
    availableFeatureIds,
    eventPrices,
    getFeatureCount,
    getFeatureSplitPrice
} = injectEventView();

const featureMap = computed(() => {
    return FEATURES.reduce(
        (acc, feature) => {
            acc[feature.id] = feature;
            return acc;
        },
        {} as Record<EventFeature, (typeof FEATURES)[0]>
    );
});
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- Personal Contribution -->
        <div
            v-if="userParticipantStatus === 'ACCEPTED'"
            class="group relative mt-1 flex flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-emerald-500/10 sm:flex-row sm:p-5"
        >
            <div
                class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150"
            ></div>
            <div class="relative z-10 flex w-full items-center gap-4 sm:w-auto">
                <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/20 sm:h-12 sm:w-12"
                >
                    <i class="pi pi-wallet text-xl sm:text-2xl"></i>
                </div>
                <div>
                    <div
                        class="text-[10px] font-black tracking-[0.2em] text-emerald-600 uppercase sm:text-xs dark:text-emerald-400"
                    >
                        Your Personal Contribution
                    </div>
                    <div class="text-[9px] font-bold tracking-wider text-zinc-500 uppercase sm:text-[10px]">
                        Based on selected features
                    </div>
                </div>
            </div>
            <div class="relative z-10 flex w-full flex-col items-end sm:w-auto">
                <div
                    class="flex items-baseline gap-1 text-2xl font-black text-emerald-600 sm:text-3xl dark:text-emerald-400"
                >
                    {{ formatCurrency(userTotalShare) }}
                </div>
            </div>
        </div>

        <!-- Features Grid -->
        <div class="mt-2 flex flex-col gap-3">
            <div class="text-surface-600 dark:text-surface-400 flex items-center gap-2">
                <i class="pi pi-th-large"></i>
                <span class="text-sm font-semibold tracking-wider uppercase">Feature Costs Breakdown</span>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                    v-for="featureId in availableFeatureIds"
                    :key="featureId"
                    class="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 transition-all duration-300 hover:border-zinc-200 dark:border-zinc-800/50 dark:bg-zinc-900/30"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div
                                class="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                                :class="featureMap[featureId]?.color"
                            >
                                {{ featureMap[featureId]?.icon }}
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-bold">{{ featureMap[featureId]?.label }}</span>
                                <span class="text-[9px] font-black tracking-widest text-zinc-400 uppercase">
                                    {{ getFeatureCount(featureId) }} participating
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800/50">
                        <div v-if="eventPrices[featureId] !== null" class="flex flex-col gap-0.5">
                            <div class="flex items-center justify-between">
                                <span class="text-[9px] font-bold tracking-tighter text-zinc-400 uppercase">
                                    Budget
                                </span>
                                <span class="text-[10px] font-bold text-zinc-500">
                                    {{ formatCurrency(eventPrices[featureId] ?? 0) }}
                                </span>
                            </div>
                            <div class="mt-1 flex items-center justify-between">
                                <span class="text-[10px] font-black tracking-widest text-emerald-500 uppercase"
                                    >Your Share</span
                                >
                                <span class="text-lg font-black text-emerald-500">
                                    {{ formatCurrency(getFeatureSplitPrice(featureId)) }}
                                </span>
                            </div>
                        </div>
                        <div v-else class="flex flex-col items-center justify-center py-2">
                            <span class="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                                No budget set
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
