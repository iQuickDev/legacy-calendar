import { useToast } from 'primevue/usetoast';

/**
 * Composable to handle sharing an event by copying its link to the clipboard.
 * Provides consistent toast notifications across the app.
 */
export function useShareEvent() {
    const toast = useToast();

    const shareEvent = (eventId: number) => {
        const url = `${window.location.origin}/event/${eventId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.add({
                severity: 'success',
                summary: 'Link Copied',
                detail: 'Event link has been copied to clipboard',
                life: 3000
            });
        });
    };

    return {
        shareEvent
    };
}
