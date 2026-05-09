<script setup lang="ts">
import { computed } from 'vue';
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import Tag from 'primevue/tag';
import { useNow } from '../composables/useNow';

const props = defineProps<{
    targetDate: string | Date | undefined;
    severity?: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
}>();

const { now } = useNow();

const timeRemaining = computed(() => {
    if (!props.targetDate) return '';

    const date = typeof props.targetDate === 'string' ? parseISO(props.targetDate) : props.targetDate;

    const days = differenceInDays(date, now.value);
    const hours = differenceInHours(date, now.value) % 24;
    const minutes = differenceInMinutes(date, now.value) % 60;

    if (days < 0 || hours < 0 || minutes < 0) return '';

    return `in ${days}d ${hours}h ${minutes}m`;
});
</script>

<template>
    <Tag v-if="timeRemaining" :value="timeRemaining" :severity="severity || 'secondary'" :pt="{ label: 'text-xs' }" />
</template>
