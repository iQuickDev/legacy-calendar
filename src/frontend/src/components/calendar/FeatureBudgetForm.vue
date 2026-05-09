<script setup lang="ts">
import { FEATURES } from '../../constants/features';
import type { EventFeature } from '../../types/Event';
import ToggleSwitch from 'primevue/toggleswitch';
import InputNumber from 'primevue/inputnumber';

const selectedFeatures = defineModel<EventFeature[]>('selectedFeatures', { required: true });
const featurePrices = defineModel<Record<EventFeature, number | null>>('featurePrices', { required: true });

defineProps<{
    compact?: boolean;
}>();

function toggleFeature(featureId: EventFeature) {
    const index = selectedFeatures.value.indexOf(featureId);
    if (index === -1) {
        selectedFeatures.value.push(featureId);
    } else {
        selectedFeatures.value.splice(index, 1);
    }
}
</script>

<template>
    <div class="flex flex-col gap-3">
        <label v-if="!compact" class="text-sm font-bold tracking-widest text-zinc-500 uppercase">
            Event Features & Budgets
        </label>
        <div class="space-y-3">
            <div
                v-for="feature in FEATURES"
                :key="feature.id"
                class="flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300"
                :class="[
                    selectedFeatures.includes(feature.id)
                        ? 'border-emerald-500/30 bg-zinc-50 ring-1 ring-emerald-500/10 dark:bg-zinc-900/50'
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
                ]"
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <button
                            @click="toggleFeature(feature.id)"
                            type="button"
                            class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-inner transition-all duration-300 focus:outline-none"
                            :class="[
                                selectedFeatures.includes(feature.id)
                                    ? feature.color
                                    : 'bg-zinc-100 text-zinc-400 opacity-50 dark:bg-zinc-900'
                            ]"
                        >
                            {{ feature.icon }}
                        </button>
                        <div class="flex flex-col">
                            <span
                                class="text-sm font-bold"
                                :class="selectedFeatures.includes(feature.id) ? '' : 'text-zinc-500'"
                            >
                                {{ feature.label }}
                            </span>
                            <template v-if="!compact">
                                <span
                                    v-if="selectedFeatures.includes(feature.id)"
                                    class="animate-in fade-in text-[9px] font-black tracking-widest text-emerald-500 uppercase duration-500"
                                >
                                    Feature Active
                                </span>
                                <span v-else class="text-[9px] font-black tracking-widest text-zinc-400 uppercase">
                                    Disabled
                                </span>
                            </template>
                        </div>
                    </div>
                    <ToggleSwitch
                        :modelValue="selectedFeatures.includes(feature.id)"
                        @update:modelValue="toggleFeature(feature.id)"
                    />
                </div>

                <div
                    v-if="selectedFeatures.includes(feature.id)"
                    class="animate-in fade-in slide-in-from-top-2 duration-300"
                >
                    <div class="flex flex-col gap-2 pt-2">
                        <label
                            :for="`price-${feature.id}`"
                            class="text-[10px] font-black tracking-widest text-zinc-500 uppercase"
                        >
                            Total Feature Budget (EUR)
                        </label>
                        <div class="relative">
                            <InputNumber
                                :id="`price-${feature.id}`"
                                v-model="featurePrices[feature.id]"
                                mode="currency"
                                currency="EUR"
                                locale="de-DE"
                                placeholder="0,00 €"
                                fluid
                                :min="0"
                                :max="10000"
                                inputClass="!rounded-xl !bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-800 !pl-4"
                            />
                        </div>
                        <p class="text-[10px] text-zinc-400 italic">
                            The cost will be split among all participants who select this feature.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
