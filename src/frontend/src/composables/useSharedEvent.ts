import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Event } from '../types/Event';

/**
 * Composable to handle events shared via URL query parameters (e.g., ?event=123).
 * Automatically parses the ID, finds the event, and opens it using the provided callback.
 */
export function useSharedEvent(args: {
    onOpenEvent: (event: Event) => void;
    findEvent: (id: number) => Event | undefined | Promise<Event | undefined>;
}) {
    const route = useRoute();
    const router = useRouter();

    const handleSharedEvent = async () => {
        const sharedEventId = route.query.event;
        if (!sharedEventId) return;

        const eventId = parseInt(sharedEventId as string);
        if (isNaN(eventId)) return;

        const event = await args.findEvent(eventId);
        if (event) {
            args.onOpenEvent(event);

            // Clean up the URL
            const query = { ...route.query };
            delete query.event;
            router.replace({ query });
        }
    };

    onMounted(handleSharedEvent);

    // Also watch for query changes (e.g. if navigating between events via deep links)
    watch(
        () => route.query.event,
        (newVal) => {
            if (newVal) handleSharedEvent();
        }
    );

    return {
        handleSharedEvent
    };
}
