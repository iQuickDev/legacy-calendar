<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import type { Event, CreateEventDto } from '../../types/Event';
import { useEventsStore } from '../../stores/events';
import { useUsersStore } from '../../stores/users';
import EventEditForm from './event-view/EventEditForm.vue';
import { storeToRefs } from 'pinia';

const props = defineProps<{
    visible: boolean;
    event: Event | null;
}>();

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'saved'): void;
    (e: 'deleted', id: number): void;
}>();

const eventsStore = useEventsStore();
const usersStore = useUsersStore();
const toast = useToast();

const { users } = storeToRefs(usersStore);
const formRef = ref<InstanceType<typeof EventEditForm> | null>(null);

const handleSave = async (dto: CreateEventDto) => {
    if (!props.event) return;

    const success = await eventsStore.updateEvent(props.event.id, dto);
    if (success) {
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Event updated successfully',
            life: 3000
        });
        emit('update:visible', false);
        emit('saved');
    } else {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: eventsStore.error || 'Failed to update event',
            life: 5000
        });
    }
};

const triggerSave = () => {
    if (formRef.value) {
        formRef.value.onSave();
    }
};

const onDelete = () => {
    if (props.event) {
        emit('deleted', props.event.id);
    }
};
watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            usersStore.fetchUsers();
        }
    }
);
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        modal
        header="Edit Event"
        :style="{ width: '800px' }"
        :breakpoints="{ '960px': '85vw', '640px': '95vw' }"
        class="p-fluid"
        dismissableMask
        :draggable="false"
    >
        <EventEditForm
            v-if="event"
            ref="formRef"
            :event="event"
            :users="users"
            :saving="eventsStore.loading"
            @save="handleSave"
            @cancel="emit('update:visible', false)"
            @delete="onDelete"
        />

        <template #footer>
            <div class="flex w-full justify-between gap-2 pt-4">
                <div class="hidden md:flex">
                    <Button
                        label="Delete Event"
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        @click="onDelete"
                        :disabled="eventsStore.loading"
                        class="rounded-xl!"
                    />
                </div>
                <div class="flex flex-1 justify-end gap-2 md:flex-initial">
                    <Button
                        label="Cancel"
                        icon="pi pi-times"
                        severity="secondary"
                        text
                        @click="emit('update:visible', false)"
                        :disabled="eventsStore.loading"
                        class="rounded-xl!"
                    />
                    <Button
                        label="Save Changes"
                        icon="pi pi-check"
                        severity="success"
                        @click="triggerSave"
                        :loading="eventsStore.loading"
                        class="rounded-xl!"
                    />
                </div>
            </div>
        </template>
    </Dialog>
</template>
