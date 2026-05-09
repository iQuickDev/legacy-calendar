import { computed, type Ref } from 'vue';
import { normalizeHexColor, mixHexColors, isHexColorLight, hexToRgba } from '../utils/color';
import { DEFAULT_COLOR } from '../constants/colors';

export function useEventCardStyle(colorRef: Ref<string | undefined>, prefix: string = 'event') {
    const activityColor = computed(() => normalizeHexColor(colorRef.value, DEFAULT_COLOR));

    const cardStyle = computed(() => {
        const c = activityColor.value;
        return {
            [`--${prefix}-accent`]: c,
            [`--${prefix}-accent-soft`]: hexToRgba(c, 0.09),
            [`--${prefix}-accent-faint`]: hexToRgba(c, 0.035),
            [`--${prefix}-accent-border`]: hexToRgba(c, 0.22),
            [`--${prefix}-accent-glow`]: hexToRgba(c, 0.2),
            [`--${prefix}-accent-shadow`]: hexToRgba(c, 0.16)
        };
    });

    const navigationButtonStyle = computed(() => {
        const c = activityColor.value;
        return {
            background: `linear-gradient(135deg, ${mixHexColors(c, '#ffffff', 0.08)} 0%, ${mixHexColors(c, '#000000', 0.05)} 100%)`,
            boxShadow: `0 14px 24px -18px ${hexToRgba(c, 0.45)}`,
            color: isHexColorLight(c) ? '#111111' : '#ffffff',
            borderColor: hexToRgba(c, 0.3),
            [`--${prefix}-action-border-hover`]: hexToRgba(c, 0.42)
        };
    });

    const locationStyle = computed(() => {
        const c = activityColor.value;
        return {
            borderColor: hexToRgba(c, 0.18),
            background: `linear-gradient(135deg, ${hexToRgba(c, 0.08)} 0%, rgba(22, 22, 22, 0.96) 68%)`
        };
    });

    return {
        activityColor,
        cardStyle,
        navigationButtonStyle,
        locationStyle
    };
}
