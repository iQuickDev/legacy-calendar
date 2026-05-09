import { ref, computed, onMounted, onBeforeUnmount, type Ref, toValue, type MaybeRefOrGetter } from 'vue';
import { hexToRgba } from '../utils/color';

export interface MagicCardOptions {
    gradientSize?: MaybeRefOrGetter<number>;
    gradientColor?: MaybeRefOrGetter<string>;
    gradientOpacity?: MaybeRefOrGetter<number>;
}

export function useMagicCard(options: MagicCardOptions = {}) {
    const cardRef: Ref<HTMLElement | null> = ref(null);
    const mouseX = ref(-200);
    const mouseY = ref(-200);

    const colorWithAlpha = computed(() => {
        const color = toValue(options.gradientColor) ?? '#262626';
        const opacity = toValue(options.gradientOpacity) ?? 0.8;
        return hexToRgba(color, opacity);
    });

    const size = computed(() => toValue(options.gradientSize) ?? 200);

    function handleMouseMove(e: MouseEvent) {
        const el = cardRef.value;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        mouseX.value = e.clientX - rect.left;
        mouseY.value = e.clientY - rect.top;
    }

    function handleMouseLeave() {
        mouseX.value = -size.value;
        mouseY.value = -size.value;
    }

    const backgroundStyle = computed(() => ({
        background: `radial-gradient(${size.value}px circle at ${mouseX.value}px ${mouseY.value}px, ${colorWithAlpha.value}, transparent 100%)`
    }));

    onMounted(() => {
        const el = cardRef.value;
        if (!el) return;
        el.addEventListener('mousemove', handleMouseMove);
        el.addEventListener('mouseleave', handleMouseLeave);
        // Set initial off-screen position based on size
        mouseX.value = -size.value;
        mouseY.value = -size.value;
    });

    onBeforeUnmount(() => {
        const el = cardRef.value;
        if (!el) return;
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseleave', handleMouseLeave);
    });

    return {
        cardRef,
        backgroundStyle
    };
}
