import { computed, ref, watch, nextTick, inject, provide, type InjectionKey, type Ref } from 'vue';
import { parseISO } from 'date-fns';
import type { Event } from '../../../../types/Event';
import type { EventWeather, HourlyDataPoint } from '../../../../types/Weather';
import { mapWeatherCodeToSummary } from '../../../../composables/useEventWeather';

export interface WeatherDialogState {
    selectedDay: Ref<Date>;
    selectedHourTime: Ref<string | null>;
    hourlyScrollContainer: Ref<HTMLElement | null>;
    dayScrollContainer: Ref<HTMLElement | null>;
    availableDays: Ref<Date[]>;
    hourlyForSelectedDay: Ref<HourlyDataPoint[]>;
    selectedHour: Ref<HourlyDataPoint | null>;
    displayTemp: Ref<number>;
    displayCode: Ref<number | null>;
    displayInfo: Ref<{ summary: string; meteoconSlug: string }>;
    displayFeelsLike: Ref<number>;
    displayWind: Ref<number>;
    displayHumidity: Ref<number>;
    displayPrecipitation: Ref<number>;
    selectHour: (hour: HourlyDataPoint) => void;
    selectDay: (day: Date) => void;
    isSelected: (hour: HourlyDataPoint) => boolean;
    isSelectedDay: (day: Date) => boolean;
    formatHour: (timeStr: string) => string;
    formatDay: (date: Date) => string;
    formatDayFull: (date: Date) => string;
    resetSelection: () => void;
    isModified: Ref<boolean>;
}

const WeatherDialogKey: InjectionKey<WeatherDialogState> = Symbol('WeatherDialogState');

const getTimeZone = (timeZone?: string) => timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

const getZoneKey = (date: Date, timeZone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
};

const formatInTimeZone = (date: Date, timeZone: string, options: Intl.DateTimeFormatOptions, locale = 'en-GB') =>
    new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);

export function useWeatherDialogState(props: { visible: boolean; event: Event; weather: EventWeather | null }) {
    const selectedDay = ref<Date>(new Date());
    const selectedHourTime = ref<string | null>(null);
    const hourlyScrollContainer = ref<HTMLElement | null>(null);
    const dayScrollContainer = ref<HTMLElement | null>(null);

    const scrollToActiveHour = () => {
        nextTick(() => {
            const container = hourlyScrollContainer.value;
            if (!container) return;
            const active = container.querySelector('[data-active="true"]');
            active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    };

    const scrollToActiveDay = () => {
        nextTick(() => {
            const container = dayScrollContainer.value;
            if (!container) return;
            const active = container.querySelector('[data-active="true"]');
            active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    };

    const initSelection = () => {
        if (!props.weather?.timestamp) return;
        selectedDay.value = parseISO(props.weather.timestamp);
        selectedHourTime.value = props.weather.timestamp;
        setTimeout(() => {
            scrollToActiveDay();
            scrollToActiveHour();
        }, 100);
    };

    watch(
        () => props.visible,
        (visible) => {
            if (visible) initSelection();
        }
    );
    watch(
        () => props.weather,
        (weather) => {
            if (props.visible && weather) initSelection();
        }
    );

    const availableDays = computed(() => {
        if (!props.weather?.hourly) return [];
        const timeZone = getTimeZone(props.weather.timezone);
        const days: Date[] = [];
        const seenDays = new Set<string>();
        props.weather.hourly.forEach((h) => {
            const date = parseISO(h.time);
            const dayKey = getZoneKey(date, timeZone);
            if (!seenDays.has(dayKey)) {
                seenDays.add(dayKey);
                days.push(date);
            }
        });
        return days;
    });

    const hourlyForSelectedDay = computed(() => {
        if (!props.weather?.hourly) return [];
        const timeZone = getTimeZone(props.weather.timezone);
        const selectedDayKey = getZoneKey(selectedDay.value, timeZone);
        return props.weather.hourly.filter((h) => getZoneKey(parseISO(h.time), timeZone) === selectedDayKey);
    });

    const selectedHour = computed<HourlyDataPoint | null>(() => {
        if (!props.weather?.hourly?.length) return null;
        const target = selectedHourTime.value || props.weather.timestamp;
        return props.weather.hourly.find((h) => h.time === target) || props.weather.hourly[0];
    });

    const displayTemp = computed(() => {
        if (selectedHour.value) return Math.round(selectedHour.value.temperature);
        return Math.round(props.weather?.temperature ?? 0);
    });

    const displayCode = computed(() => {
        if (selectedHour.value) return selectedHour.value.weatherCode;
        return props.weather?.weatherCode ?? null;
    });

    const displayInfo = computed(() => {
        const isDay = selectedHour.value?.isDay ?? props.weather?.isDay ?? true;
        return mapWeatherCodeToSummary(displayCode.value, isDay);
    });

    const displayFeelsLike = computed(() => {
        if (selectedHour.value) return Math.round(selectedHour.value.apparentTemperature);
        return Math.round(props.weather?.apparentTemperature ?? props.weather?.temperature ?? 0);
    });

    const displayWind = computed(() => {
        if (selectedHour.value) return Math.round(selectedHour.value.windSpeed);
        return Math.round(props.weather?.windSpeed ?? 0);
    });

    const displayHumidity = computed(() => {
        if (selectedHour.value) return Math.round(selectedHour.value.humidity);
        return Math.round(props.weather?.humidity ?? 0);
    });

    const displayPrecipitation = computed(() => {
        if (selectedHour.value) return Math.round(selectedHour.value.precipitationProbability);
        return Math.round(props.weather?.precipitationProbability ?? 0);
    });

    const selectHour = (hour: HourlyDataPoint) => {
        selectedHourTime.value = hour.time;
        scrollToActiveHour();
    };

    const selectDay = (day: Date) => {
        selectedDay.value = day;
        const timeZone = getTimeZone(props.weather?.timezone);
        const selectedDayKey = getZoneKey(day, timeZone);
        const hours =
            props.weather?.hourly?.filter((h) => getZoneKey(parseISO(h.time), timeZone) === selectedDayKey) || [];
        if (hours.length > 0) {
            selectedHourTime.value = hours[0].time;
            scrollToActiveHour();
        }
        scrollToActiveDay();
    };

    const isSelected = (hour: HourlyDataPoint) => hour.time === selectedHourTime.value;
    const isSelectedDay = (day: Date) => {
        const timeZone = getTimeZone(props.weather?.timezone);
        return getZoneKey(day, timeZone) === getZoneKey(selectedDay.value, timeZone);
    };
    const formatHour = (timeStr: string) => {
        const timeZone = getTimeZone(props.weather?.timezone);
        return formatInTimeZone(parseISO(timeStr), timeZone, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };
    const formatDay = (date: Date) => {
        const timeZone = getTimeZone(props.weather?.timezone);
        return formatInTimeZone(date, timeZone, { weekday: 'short' });
    };
    const formatDayFull = (date: Date) => {
        const timeZone = getTimeZone(props.weather?.timezone);
        return formatInTimeZone(date, timeZone, { day: 'numeric', month: 'short' });
    };

    const state: WeatherDialogState = {
        selectedDay,
        selectedHourTime,
        hourlyScrollContainer,
        dayScrollContainer,
        availableDays,
        hourlyForSelectedDay,
        selectedHour,
        displayTemp,
        displayCode,
        displayInfo,
        displayFeelsLike,
        displayWind,
        displayHumidity,
        displayPrecipitation,
        selectHour,
        selectDay,
        isSelected,
        isSelectedDay,
        formatHour,
        formatDay,
        formatDayFull,
        resetSelection: initSelection,
        isModified: computed(() => selectedHourTime.value !== props.weather?.timestamp)
    };

    provide(WeatherDialogKey, state);
    return state;
}

export function injectWeatherDialogState() {
    const state = inject(WeatherDialogKey);
    if (!state) throw new Error('useWeatherDialogState must be provided');
    return state;
}
