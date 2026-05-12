import type { TransportMode } from '../types/Event';

export interface TransportOptionConfig {
    id: TransportMode;
    label: string;
    icon: string;
    color: string;
}

export const TRANSPORT_OPTIONS: TransportOptionConfig[] = [
    {
        id: 'NEEDS_RIDE',
        label: 'Need a ride',
        icon: '🙋',
        color: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 ring-amber-500'
    },
    {
        id: 'SELF',
        label: 'By myself',
        icon: '🚶',
        color: 'bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 ring-sky-500'
    },
    {
        id: 'DRIVER',
        label: 'I can drive',
        icon: '🚗',
        color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 ring-emerald-500'
    }
];
