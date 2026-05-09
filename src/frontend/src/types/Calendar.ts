import type { Event } from './Event';

export interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    events: Event[];
}

export interface CalendarVisibleRange {
    monthKey: string;
    start: Date;
    end: Date;
}
