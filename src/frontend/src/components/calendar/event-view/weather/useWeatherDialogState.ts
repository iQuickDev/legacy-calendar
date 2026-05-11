import { computed, ref, watch, nextTick, inject, provide, type InjectionKey, type Ref } from 'vue';
import { parseISO, isSameDay, format } from 'date-fns';
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
    formatHour: (timeStr: string) => string;
    formatDay: (date: Date) => string;
    formatDayFull: (date: Date) => string;
    resetSelection: () => void;
    isModified: Ref<boolean>;
}

const WeatherDialogKey: InjectionKey<WeatherDialogState> = Symbol('WeatherDialogState');

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
        const days: Date[] = [];
        props.weather.hourly.forEach((h) => {
            const date = parseISO(h.time);
            if (!days.find((d) => isSameDay(d, date))) {
                days.push(date);
            }
        });
        return days;
    });

    const hourlyForSelectedDay = computed(() => {
        if (!props.weather?.hourly) return [];
        return props.weather.hourly.filter((h) => isSameDay(parseISO(h.time), selectedDay.value));
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
        const hours = props.weather?.hourly?.filter((h) => isSameDay(parseISO(h.time), day)) || [];
        if (hours.length > 0) {
            selectedHourTime.value = hours[0].time;
            scrollToActiveHour();
        }
        scrollToActiveDay();
    };

    const isSelected = (hour: HourlyDataPoint) => hour.time === selectedHourTime.value;
    const formatHour = (timeStr: string) => format(parseISO(timeStr), 'HH:mm');
    const formatDay = (date: Date) => format(date, 'EEE');
    const formatDayFull = (date: Date) => format(date, 'd MMM');

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
