<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'date-fns';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ScrollPanel from 'primevue/scrollpanel';
import type { CalendarDay } from '../../types/Calendar';
import type { Event } from '../../types/Event';
import UpcomingEventCard from '../UpcomingEventCard.vue';

const props = defineProps<{
    visible: boolean;
    day: CalendarDay | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'add-event', date: Date): void;
    (e: 'view-event', event: Event): void;
}>();

const close = () => emit('update:visible', false);

const dateTitle = computed(() => {
    if (!props.day) return '';
    return format(props.day.date, 'EEEE, MMMM do');
});

const handleAddEvent = () => {
    if (props.day) {
        emit('add-event', props.day.date);
        close();
    }
};

const handleViewEvent = (event: Event) => {
    emit('view-event', event);
    close();
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        header=" "
        :style="{ width: '90vw', maxWidth: '500px' }"
        :breakpoints="{ '960px': '85vw', '640px': '95vw' }"
        class="day-view-dialog"
        dismissableMask
        :pt="{
            root: 'relative overflow-hidden',
            header: 'pb-0! px-6 pt-2! z-10',
            content: 'pb-0! flex-1 min-h-0',
            footer: 'absolute bottom-0 left-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pt-12 pb-6 px-6 z-20 border-t-0'
        }"
    >
        <template #header>
            <div class="relative py-4">
                <h2 class="mb-1 text-xs font-bold tracking-widest text-zinc-400 uppercase">Day Overview</h2>
                <h1 class="text-2xl font-black text-white">{{ dateTitle }}</h1>
            </div>
        </template>

        <ScrollPanel
            v-if="day"
            class="min-h-0 flex-1"
            :pt="{
                content: `pt-1! flex flex-col gap-4 ${!day?.isPast && 'pb-20!'}`
            }"
        >
            <div v-if="day.events.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
                <i class="pi pi-calendar-times mb-4 text-4xl text-zinc-800"></i>
                <p class="font-medium text-zinc-500">No events scheduled for this day.</p>
            </div>

            <UpcomingEventCard
                v-for="event in day.events"
                :key="event.id"
                :event="event"
                class="border-zinc-800! bg-zinc-900/50! hover:border-zinc-700!"
                @view="handleViewEvent"
            />
        </ScrollPanel>

        <template #footer v-if="day && !day.isPast">
            <div class="w-full">
                <Button
                    label="Add New Event"
                    icon="pi pi-plus"
                    class="w-full rounded-xl! py-3! font-bold!"
                    @click="handleAddEvent"
                />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
@media (max-width: 641px) {
    .day-view-dialog :deep(.p-dialog-root) {
        height: 100%;
        max-height: 100%;
    }
}
</style>
