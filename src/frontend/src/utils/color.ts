import { DEFAULT_COLOR } from '../constants/colors';

const SHORT_HEX_COLOR = /^#([\da-f]{3})$/i;
const LONG_HEX_COLOR = /^#([\da-f]{6})$/i;

function clampAlpha(alpha: number) {
    return Math.min(Math.max(alpha, 0), 1);
}

function expandShortHex(match: RegExpMatchArray) {
    return `#${match[1]
        .split('')
        .map((value) => `${value}${value}`)
        .join('')}`.toLowerCase();
}

function channelToHex(channel: number) {
    return Math.round(Math.min(Math.max(channel, 0), 255))
        .toString(16)
        .padStart(2, '0');
}

function toRgbChannels(color: string | undefined, fallback = DEFAULT_COLOR) {
    const normalized = normalizeHexColor(color, fallback);
    const hex = normalized.slice(1);

    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
}

export function normalizeHexColor(color: string | undefined, fallback = DEFAULT_COLOR) {
    if (!color) return fallback;

    const trimmed = color.trim();
    if (LONG_HEX_COLOR.test(trimmed)) return trimmed.toLowerCase();

    const shortHexMatch = trimmed.match(SHORT_HEX_COLOR);
    if (shortHexMatch) return expandShortHex(shortHexMatch);

    return fallback;
}

export function hexToRgba(color: string | undefined, alpha: number, fallback = DEFAULT_COLOR) {
    const { r, g, b } = toRgbChannels(color, fallback);
    return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}

export function mixHexColors(
    colorA: string | undefined,
    colorB: string | undefined,
    weight = 0.5,
    fallback = DEFAULT_COLOR
) {
    const mixWeight = Math.min(Math.max(weight, 0), 1);
    const first = toRgbChannels(colorA, fallback);
    const second = toRgbChannels(colorB, fallback);

    return `#${channelToHex(first.r + (second.r - first.r) * mixWeight)}${channelToHex(first.g + (second.g - first.g) * mixWeight)}${channelToHex(first.b + (second.b - first.b) * mixWeight)}`;
}

export function isHexColorLight(color: string | undefined, fallback = DEFAULT_COLOR) {
    const { r, g, b } = toRgbChannels(color, fallback);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness >= 160;
}
