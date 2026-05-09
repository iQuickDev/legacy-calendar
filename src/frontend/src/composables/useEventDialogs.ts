import { ref, computed, type Ref } from 'vue';
import { useEventsStore } from '../stores/events';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type { Event } from '../types/Event';

export function useEventDialogs(events: Ref<Event[]>, externalEvent?: Ref<Event | null>) {
    const eventsStore = useEventsStore();
    const toast = useToast();
    const confirm = useConfirm();

    const selectedEventId = ref<number | null>(null);
    const showViewDialog = ref(false);
    const showEditDialog = ref(false);
    const eventToEdit = ref<Event | null>(null);

    const selectedEvent = computed(() => {
        if (!selectedEventId.value) return null;
        const event = events.value.find((e) => e.id === selectedEventId.value);
        if (event) return event;
        if (externalEvent?.value && externalEvent.value.id === selectedEventId.value) {
            return externalEvent.value;
        }
        return null;
    });

    const openViewEvent = (eventOrId: number | Event) => {
        selectedEventId.value = typeof eventOrId === 'number' ? eventOrId : eventOrId.id;
        showViewDialog.value = true;
    };

    const handleEditEvent = (event: Event) => {
        eventToEdit.value = JSON.parse(JSON.stringify(event));
        showEditDialog.value = true;
    };

    const handleDeleteEvent = async (id: number) => {
        confirm.require({
            message: 'Are you sure you want to delete this event? This action cannot be undone.',
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            rejectProps: {
                label: 'Cancel',
                severity: 'secondary',
                outlined: true
            },
            acceptProps: {
                label: 'Delete Event',
                severity: 'danger'
            },
            accept: async () => {
                const success = await eventsStore.deleteEvent(id);
                if (success) {
                    toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Event deleted successfully',
                        life: 3000
                    });
                    showViewDialog.value = false;
                    showEditDialog.value = false;
                }
            }
        });
    };

    return {
        selectedEventId,
        showViewDialog,
        showEditDialog,
        eventToEdit,
        selectedEvent,
        openViewEvent,
        handleEditEvent,
        handleDeleteEvent
    };
}
