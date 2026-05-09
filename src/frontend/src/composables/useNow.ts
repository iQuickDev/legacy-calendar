import { ref, onMounted, onUnmounted, readonly } from 'vue';

// Singleton state
const now = ref(new Date());
let subscribers = 0;
let timerId: ReturnType<typeof setInterval> | null = null;

/**
 * Singleton timer composable that provides a globally shared reactive "now" reference.
 * Prevents multiple components from spinning up independent intervals.
 */
export function useNow() {
    const startTimer = () => {
        if (!timerId) {
            timerId = setInterval(() => {
                now.value = new Date();
            }, 1000);
        }
    };

    const stopTimer = () => {
        if (timerId && subscribers === 0) {
            clearInterval(timerId);
            timerId = null;
        }
    };

    onMounted(() => {
        subscribers++;
        startTimer();
    });

    onUnmounted(() => {
        subscribers--;
        stopTimer();
    });

    return {
        now: readonly(now)
    };
}
