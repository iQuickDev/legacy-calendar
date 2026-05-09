<script setup lang="ts">
import { PREDEFINED_COLORS } from '../../constants/colors';

defineProps<{
    modelValue: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();
</script>

<template>
    <div class="mx-auto mt-1 flex flex-wrap gap-2">
        <button
            v-for="color in PREDEFINED_COLORS"
            :key="color"
            type="button"
            class="h-8 w-8 rounded-full border-2 transition-all duration-200 focus:outline-hidden"
            :class="[
                modelValue === color
                    ? 'border-surface-900 dark:border-surface-0 scale-110 shadow-md'
                    : 'border-transparent shadow-sm hover:scale-105'
            ]"
            :style="{ backgroundColor: color }"
            @click="emit('update:modelValue', color)"
            aria-label="Select color"
        ></button>
    </div>
</template>
